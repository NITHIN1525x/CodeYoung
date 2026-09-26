from django.urls import path

from chatbot import views

urlpatterns = [
    path("support/callbacks/", views.create_support_callback, name="support-callback-create"),
    path("admin/support-callbacks/", views.admin_support_callbacks, name="admin-support-callbacks"),
]
