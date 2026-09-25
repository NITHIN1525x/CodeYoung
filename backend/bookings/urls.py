from django.urls import path

from bookings.api import views

urlpatterns = [
    path("availability/", views.availability, name="availability"),
    path("bookings/", views.create_booking_view, name="create-booking"),
    path("bookings/<int:booking_id>/", views.retrieve_booking_view, name="retrieve-booking"),
    path("demo-classes/<str:meeting_id>/", views.demo_class_view, name="demo-class-detail"),
    path("mentors/", views.mentors_list_view, name="mentors-list"),
    path("mentors/<int:mentor_id>/bookings/", views.mentor_dashboard_bookings_view, name="mentor-dashboard-bookings"),
    path("mentor/bookings/", views.mentor_bookings_view, name="mentor-bookings"),
    path("admin/bookings/", views.admin_bookings_view, name="admin-bookings"),
    path("admin/email-outbox/", views.admin_outbox_view, name="admin-email-outbox"),
]
