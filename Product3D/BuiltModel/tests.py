from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image

from .models import Generation, Product


def image_upload(name="product.png"):
    buffer = BytesIO()
    Image.new("RGB", (32, 32), "white").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class SellerWorkflowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="seller", password="correct-horse"
        )
        self.other_user = get_user_model().objects.create_user(
            username="other", password="correct-horse"
        )
        self.client.force_login(self.user)

    @patch("BuiltModel.views.TripoClient")
    def test_seller_can_create_product_and_start_generation(self, client_class):
        client_class.return_value.upload_image.return_value = "file_token"
        client_class.return_value.create_image_task.return_value = "task-123"

        response = self.client.post(
            "/seller/",
            {"name": "Chair", "category": "home", "image": image_upload()},
        )

        self.assertRedirects(response, "/seller/")
        product = Product.objects.get(name="Chair")
        generation = product.generations.get()
        self.assertEqual(product.seller, self.user)
        self.assertEqual(generation.task_id, "task-123")
        self.assertEqual(generation.status, "queued")

    def test_seller_cannot_read_another_sellers_product(self):
        product = Product.objects.create(seller=self.other_user, name="Private")

        response = self.client.get(f"/api/products/{product.pk}/status/")

        self.assertEqual(response.status_code, 404)

    @patch("BuiltModel.views.TripoClient")
    def test_successful_status_downloads_and_stores_glb(self, client_class):
        product = Product.objects.create(
            seller=self.user, name="Lamp", image=image_upload()
        )
        Generation.objects.create(
            product=product, task_id="task-456", status="running"
        )
        client_class.return_value.get_task.return_value = {
            "status": "success",
            "progress": 100,
            "output": {
                "model_url": "https://cdn.example/model.glb",
                "rendered_image_url": "https://cdn.example/preview.png",
            },
            "credits_consumed": 1.25,
        }
        client_class.return_value.download_model.return_value = b"glTF binary"

        response = self.client.get(f"/api/products/{product.pk}/status/")

        self.assertEqual(response.status_code, 200)
        product.refresh_from_db()
        generation = product.generations.get()
        self.assertTrue(product.model_file.name.endswith(".glb"))
        self.assertEqual(generation.status, "success")
        self.assertEqual(generation.credits_consumed, 1.25)

    def test_login_and_logout(self):
        self.client.logout()
        self.assertRedirects(self.client.get("/seller/"), "/login/?next=/seller/")
        self.assertTrue(
            self.client.login(username="seller", password="correct-horse")
        )
        self.assertRedirects(self.client.post("/logout/"), "/login/")
