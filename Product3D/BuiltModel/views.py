from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.files.base import ContentFile
from django.http import JsonResponse, HttpResponseForbidden
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST
from .models import Product, Generation
from .services.tripo import TripoClient, TripoError
from django.db.models import Q


def home(request):
    products = Product.objects.filter(is_published=True).order_by("-created_at")[:3]
    return render(request, "landing.html", {"products": products})


def explore(request):
    products = Product.objects.filter(is_published=True)
    return render(request, "explore.html", {"products": products})
def login_view(request):
    if request.user.is_authenticated: return redirect("seller_dashboard")
    if request.method=="POST":
        user=authenticate(request,username=request.POST.get("username",""),password=request.POST.get("password",""))
        if user:
            login(request,user); return redirect("seller_dashboard")
        messages.error(request,"Invalid username or password.")
    return render(request,"login.html")
def logout_view(request):
    if request.method=="POST": logout(request)
    return redirect("login")


@login_required
def seller_dashboard(request):

    # ==========================================
    # 1. HANDLE PRODUCT CREATION
    # ==========================================

    if request.method == "POST":

        name = request.POST.get("name", "").strip()
        image = request.FILES.get("image")

        if not name or not image:
            messages.error(
                request,
                "Product name and one product image are required."
            )
            return redirect("seller_dashboard")

        # Validate image content type
        if image.content_type not in (
            "image/jpeg",
            "image/png",
            "image/webp"
        ):
            messages.error(
                request,
                "Upload a JPG, PNG or WebP image."
            )
            return redirect("seller_dashboard")

        # Validate image size (20 MB)
        if image.size > 20 * 1024 * 1024:
            messages.error(
                request,
                "Image must be 20 MB or smaller."
            )
            return redirect("seller_dashboard")

        # Validate actual image content
        try:
            with Image.open(image) as uploaded_image:

                if uploaded_image.format not in (
                    "JPEG",
                    "PNG",
                    "WEBP"
                ):
                    raise ValidationError(
                        "Upload a JPG, PNG or WebP image."
                    )

                uploaded_image.verify()

            image.seek(0)

        except (
            UnidentifiedImageError,
            OSError,
            ValidationError
        ):
            messages.error(
                request,
                "The uploaded file is not a valid image."
            )
            return redirect("seller_dashboard")

        # ======================================
        # 2. SAVE PRODUCT
        # ======================================

        product = Product.objects.create(
            seller=request.user,
            name=name,
            category=request.POST.get("category", "other"),
            description=request.POST.get("description", ""),
            image=image
        )

        generation = Generation.objects.create(
            product=product
        )

        # ======================================
        # 3. START TRIPO AI GENERATION
        # ======================================

        try:

            client = TripoClient()

            token = client.upload_image(product.image)

            task_id = client.create_image_task(token)

            generation.task_id = task_id
            generation.status = "queued"

            generation.save(
                update_fields=["task_id", "status"]
            )

            messages.success(
                request,
                "Product saved. 3D generation has started."
            )

        except (TripoError, OSError) as exc:

            generation.status = "failed"
            generation.error_message = str(exc)
            generation.completed_at = timezone.now()

            generation.save()

            messages.error(
                request,
                f"Product saved, but generation could not start: {exc}"
            )

        # Always redirect after POST
        return redirect("seller_dashboard")

    # ==========================================
    # 4. FETCH SELLER PRODUCTS
    # ==========================================

    products = Product.objects.filter(
        seller=request.user
    ).prefetch_related("generations")

    # ==========================================
    # 5. CALCULATE DASHBOARD STATISTICS
    # ==========================================

    ready_count = products.filter(
        model_file__gt=""
    ).count()

    published_count = products.filter(
        is_published=True
    ).count()

    pending_count = Generation.objects.filter(
        product__seller=request.user,
        status__in=["queued", "running"]
    ).count()

    # ==========================================
    # 6. RENDER SELLER DASHBOARD
    # ==========================================

    return render(request, "dashboard.html", {
        "products": products,
        "ready_count": ready_count,
        "published_count": published_count,
        "pending_count": pending_count,
    })


@login_required
@require_GET
def generation_status(request,pk):
    product=get_object_or_404(Product,pk=pk,seller=request.user)
    generation=product.generations.first()
    if not generation: return JsonResponse({"error":"No generation job found."},status=404)
    if generation.task_id and generation.status in ("queued","running"):
        try:
            client=TripoClient(); data=client.get_task(generation.task_id)
            generation.status=data.get("status",generation.status)
            generation.progress=max(0, min(100, int(data.get("progress",generation.progress) or 0)))
            if generation.status=="success":
                output=data.get("output") or {}; model_url=output.get("model_url")
                if not model_url: raise TripoError("Task succeeded but Tripo did not return output.model_url.")
                content=client.download_model(model_url)
                product.model_file.save(f"product-{product.pk}.glb",ContentFile(content),save=True)
                product.preview_image_url=output.get("rendered_image_url",""); product.save(update_fields=["preview_image_url"])
                generation.credits_consumed=data.get("credits_consumed"); generation.completed_at=timezone.now()
            elif generation.status in ("failed","cancelled","banned","expired"):
                generation.error_message=data.get("error_message",f"Tripo task {generation.status}."); generation.completed_at=timezone.now()
            generation.save()
        except (TripoError, OSError, ValueError) as exc:
            generation.error_message=str(exc)
            # Keep the task retryable for transient polling/download failures.
            generation.save(update_fields=["error_message"])
    return JsonResponse({"status":generation.status,"progress":generation.progress,"error":generation.error_message,"model_url":product.model_file.url if product.model_file else "","preview_url":product.preview_image_url,"published":product.is_published})

def product_detail(request,pk):
    product=get_object_or_404(Product,pk=pk)
    if not product.is_published and (
        not request.user.is_authenticated or product.seller_id != request.user.id
    ):
        return HttpResponseForbidden("This product is not published.")
    has_real_model = bool(product.model_file)
    model_url = product.model_file.url if has_real_model else (
        "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/"
        "DamagedHelmet.glb"
    )
    return render(request, "product_detail.html", {
        "product": product,
        "model_url": model_url,
        "has_real_model": has_real_model,
    })


@login_required
@require_POST
def publish_product(request, pk):
    product = get_object_or_404(Product, pk=pk, seller=request.user)
    if not product.model_file:
        return JsonResponse({"error": "Generate a 3D model before publishing."}, status=400)
    product.is_published = True
    product.save(update_fields=["is_published", "updated_at"])
    return JsonResponse({"published": True})


@login_required
@require_POST
def regenerate_product(request, pk):
    product = get_object_or_404(Product, pk=pk, seller=request.user)
    if not product.image:
        return JsonResponse({"error": "This product has no source image."}, status=400)
    generation = Generation.objects.create(product=product)
    try:
        client = TripoClient()
        token = client.upload_image(product.image)
        generation.task_id = client.create_image_task(token)
        generation.save(update_fields=["task_id"])
    except (TripoError, OSError) as exc:
        generation.status = "failed"
        generation.error_message = str(exc)
        generation.completed_at = timezone.now()
        generation.save(update_fields=["status", "error_message", "completed_at"])
        return JsonResponse({"error": str(exc)}, status=502)
    return JsonResponse({"status": generation.status})


@login_required
@require_POST
def delete_product(request, pk):
    product = get_object_or_404(Product, pk=pk, seller=request.user)
    product.delete()
    return JsonResponse({"deleted": True})
