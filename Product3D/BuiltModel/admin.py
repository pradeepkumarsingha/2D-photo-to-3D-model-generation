from django.contrib import admin
from .models import Product, Generation
class GenerationInline(admin.TabularInline):
    model=Generation; extra=0; readonly_fields=("task_id","status","progress","error_message","created_at","completed_at")
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display=("name","seller","category","is_published","created_at")
    list_filter=("category","is_published","created_at")
    search_fields=("name","description","seller__username")
    inlines=[GenerationInline]
@admin.register(Generation)
class GenerationAdmin(admin.ModelAdmin):
    list_display=("product","status","progress","task_id","created_at")
    list_filter=("status","provider")
    readonly_fields=("created_at","completed_at")
