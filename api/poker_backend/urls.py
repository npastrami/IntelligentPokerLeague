"""
URL configuration for poker_backend project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/poker/', include('poker.urls')),
    path('api/teams/', include('team.urls')),
    path('api/leaderboard/', include('leaderboard.urls')),
    path('api/dev/', include('dev.urls')),
]