from django.urls import path
from . import views

urlpatterns = [
    # Basic views
    path('', views.home_view, name='poker_home'),
    path('table/', views.game_table, name='game_table'),
    
    # Game initialization and management
    path('initialize-game/', views.initialize_game, name='initialize_game'),
    path('join-game/', views.join_game, name='join_game'),
    path('make-move/', views.make_move, name='make_move'),
    path('start-hand/', views.start_hand, name='start_hand'),
    path('buy-in/', views.buy_in, name='buy_in'),
    path('exit-game/', views.exit_game, name='exit_game'),
    path('cashout/', views.cashout_game, name='cashout_game'),

    
    path('bot-game/start/', views.start_bot_game_simulation, name='start_bot_game'),
    path('bot-game/pause/', views.pause_bot_game_simulation, name='pause_bot_game'),
    path('bot-game/status/', views.get_bot_game_progress, name='bot_game_status'),
    
    # Bot and game management
    path('post-bot/', views.post_bot, name='post_bot'),
    path('available-games/', views.get_available_games_api, name='available_games'),
    path('get-user-bots/', views.get_user_bots, name='get_user_bots'),
    path('get-opponent-bots/', views.get_available_opponent_bots, name='get_opponent_bots'),
    
    # Bot vs Bot game management
    path('start-bot-vs-bot/', views.start_bot_vs_bot_game, name='start_bot_vs_bot'),
    path('start-bot-simulation/', views.start_bot_game_simulation, name='start_bot_simulation'),
    path('pause-bot-simulation/', views.pause_bot_game_simulation, name='pause_bot_simulation'),
    path('bot-game-progress/', views.get_bot_game_progress, name='bot_game_progress'),
    
    # Development environment
    path('save-code/', views.save_code, name='save_code'),
    path('run-code/', views.run_code, name='run_code'),
    path('execute-command/', views.execute_command, name='execute_command'),
    path('skeleton-files/', views.get_skeleton_files, name='skeleton_files'),
    path('skeleton-files/<path:path>/', views.get_skeleton_file_content, name='skeleton_file_content'),
    path('create-file/', views.create_file, name='create_file'),
    path('list-files/', views.list_user_files, name='list_user_files'),
    path('upload-file/', views.upload_file, name='upload_file'),  
    path('load-file/<str:filename>/', views.load_file, name='load_file'), 
    path('save-file/', views.save_file_to_storage, name='save_file_to_storage'),  
    path('dev/create-file/', views.create_file, name='create_file'),
    path('dev/save-code/', views.save_code, name='save_code'),
    path('dev/run-code/', views.run_code, name='run_code'),
    path('dev/skeletons/', views.get_skeleton_files, name='get_skeleton_files'),
    path('dev/skeletons/<path:path>', views.get_skeleton_file_content, name='get_skeleton_file_content'),
]