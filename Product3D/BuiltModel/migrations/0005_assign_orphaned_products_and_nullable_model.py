from django.conf import settings
from django.db import migrations, models


def assign_orphaned_products(apps, schema_editor):
    Product = apps.get_model("BuiltModel", "Product")
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    seller = (
        User.objects.filter(is_active=True, is_staff=True).order_by("pk").first()
        or User.objects.filter(is_active=True).order_by("pk").first()
    )
    if seller is not None:
        Product.objects.filter(seller__isnull=True).update(seller=seller)


class Migration(migrations.Migration):
    dependencies = [
        ("BuiltModel", "0004_generation_remove_productimage_unique_product_view_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="model_file",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="products/models/%Y/%m/",
            ),
        ),
        migrations.RunPython(assign_orphaned_products, migrations.RunPython.noop),
    ]
