from django.urls import path
from . import views, api

app_name = 'dev'

urlpatterns = [
    # Main editor view
    path('', views.editor_view, name='editor'),
    
    # API endpoints
    path('api/csrf/', api.get_csrf_token, name='get_csrf'),
    path('api/skeletons/', api.list_skeletons, name='list_skeletons'),  
    path('api/skeletons/<path:file_path>/', api.get_skeleton_file, name='get_skeleton_file'), 
    path('api/save-code/', api.save_code, name='save_code'), 
    path('api/run-code/', api.run_code, name='run_code'), 
    path('api/upload-file/', api.upload_file, name='upload_file'),  
]