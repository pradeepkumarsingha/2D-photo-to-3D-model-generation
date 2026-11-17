from django.urls import path
from . import views

urlpatterns = [
    # Home
    path("", views.home, name="home"),
    path("explore/", views.explore, name="explore"),

    # Seller authentication
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),

    # Single-page seller dashboard
    path("seller/", views.seller_dashboard, name="seller_dashboard"),

    # Check 3D generation status
    path(
        "api/products/<int:pk>/status/",
        views.generation_status,
        name="generation_status"
    ),
    path("api/products/<int:pk>/publish/", views.publish_product, name="publish_product"),
    path("api/products/<int:pk>/regenerate/", views.regenerate_product, name="regenerate_product"),
    path("api/products/<int:pk>/delete/", views.delete_product, name="delete_product"),

    # Product 3D viewer
    path(
        "products/<int:pk>/",
        views.product_detail,
        name="product_detail"
    ),
]
