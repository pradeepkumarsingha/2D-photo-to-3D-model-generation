
from rest_framework import serializers
from PIL import Image

from .models import Product


class ProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = '__all__'

        read_only_fields = [
        'id',
        'model_file',
        'created_at',
        'updated_at',
    ]


    def validate_image(self, image):

        allowed_formats = ['JPEG', 'PNG', 'WEBP']

        try:
            image_file = Image.open(image)
            image_format = image_file.format

            if image_format not in allowed_formats:
                raise serializers.ValidationError(
                    "Only JPG, PNG and WEBP images are allowed."
                )

            image_file.verify()

        except serializers.ValidationError:
            raise

        except Exception:
            raise serializers.ValidationError(
                "Invalid or corrupted image file."
            )

        if image.size > 20 * 1024 * 1024:
            raise serializers.ValidationError("Image size must be below 20 MB.")

        image.seek(0)
        with Image.open(image) as img:
            width, height = img.size

            if width * height > 25_000_000:
             raise serializers.ValidationError(
            "Image dimensions must not exceed 25 megapixels."
            )
        return image
