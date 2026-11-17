
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Product(models.Model):

    CATEGORY_CHOICES = [
        ("electronics", "Electronics"),
        ("fashion", "Fashion"),
        ("home", "Home & Living"),
        ("accessories", "Accessories"),
        ("other", "Other"),
    ]

    seller = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="products",
    null=True,
    blank=True
)

    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=190, blank=True)

    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default="other"
    )

    description = models.TextField(blank=True)

    # One uploaded image for AI 3D generation
    image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True
    )

    # Generated GLB model
    model_file = models.FileField(
        upload_to="products/models/%Y/%m/",
        blank=True,
        null=True
    )

    preview_image_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:180] or "product"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Generation(models.Model):

    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("running", "Generating"),
        ("success", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="generations"
    )

    provider = models.CharField(max_length=30, default="tripo")

    task_id = models.CharField(
        max_length=100,
        blank=True,
        db_index=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="queued"
    )

    progress = models.PositiveSmallIntegerField(default=0)
    error_message = models.TextField(blank=True)

    credits_consumed = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} — {self.status}"
