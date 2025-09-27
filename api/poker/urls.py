# poker_project/poker/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'poker'

urlpatterns = [
    # Main navigation
    path('', views.home_view, name='home'),
    path('game/', views.game_table, name='game'),
    
    # API endpoints (removed api/ prefix since it's in main urls.py)
    path('available-games/', views.get_available_games_api, name='available_games_api'),
    path('initialize-game/', views.initialize_game, name='initialize_game'),
    path('join-game/', views.join_game, name='join_game'),
    path('make-move/', views.make_move, name='make_move'),
    path('start-hand/', views.start_hand, name='start_hand'),
    path('get-user-bots/', views.get_user_bots, name='get_user_bots'),
    path('post-bot/', views.post_bot, name='post_bot'),
    path('buy-in/', views.buy_in, name='buy_in'),
    path('exit-game/', views.exit_game, name='exit_game'),
    
    # Development environment
    path('dev/save-code/', views.save_code, name='save_code'),
    path('dev/run-code/', views.run_code, name='run_code'),
    path('dev/skeletons/', views.get_skeleton_files, name='get_skeleton_files'),
    path('dev/skeletons/<path:path>', views.get_skeleton_file_content, name='get_skeleton_file_content'),
    
    # Bot game endpoints
    path('bot-game/start/', views.start_bot_game_simulation, name='start_bot_game'),
    path('bot-game/pause/', views.pause_bot_game_simulation, name='pause_bot_game'),
    path('bot-game/status/', views.get_bot_game_progress, name='bot_game_status'),
    
    # Bot management endpoints
    path('get-opponent-bots/', views.get_available_opponent_bots, name='get_available_opponent_bots'),
    
    # Bot vs Bot game endpoints
    path('bots/start-game/', views.start_bot_vs_bot_game, name='start_bot_vs_bot_game'),
    path('bots/next-hand/', views.start_hand, name='next_bot_vs_bot_hand'),
]