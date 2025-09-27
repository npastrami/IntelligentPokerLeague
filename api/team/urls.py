from django.urls import path
from . import views

app_name = 'team'

urlpatterns = [
    # Frontend page
    path('', views.team, name='team'),
    
    # API endpoints
    path('api/list/', views.team_list_api, name='team_list_api'),
    path('api/detail/<int:team_id>/', views.team_detail_api, name='team_detail_api'),
    path('api/create/', views.create_team_api, name='create_team_api'),
    path('api/join/<int:team_id>/', views.join_team_api, name='join_team_api'),
    path('api/leave/<int:team_id>/', views.leave_team_api, name='leave_team_api'),
    path('api/invite/<int:team_id>/', views.invite_to_team_api, name='invite_to_team_api'),
    path('api/invitations/', views.list_invitations_api, name='list_invitations_api'),
    path('api/invitations/<int:invitation_id>/accept/', views.accept_invitation_api, name='accept_invitation_api'),
    path('api/invitations/<int:invitation_id>/decline/', views.decline_invitation_api, name='decline_invitation_api'),
]