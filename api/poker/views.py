import json
import os
import uuid
import logging
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST, require_GET
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
from pathlib import Path

from .models import GameSession, BotRepository
from .manager import PokerGameManager, BotInterface, start_bot_game, stop_bot_game, get_bot_game_status
from users.models import CustomUser

logger = logging.getLogger(__name__)
User = get_user_model()

def home_view(request):
    return HttpResponse("Poker Home")

def game_table(request):
    return JsonResponse({'status': 'game_table_endpoint'})

@csrf_exempt
@require_POST
@login_required
def initialize_game(request):
    """Initialize a new poker game session"""
    try:
        data = json.loads(request.body)
        game_mode = data.get('mode', 'human')  # 'human' or 'bot'
        
        # Get player
        player = request.user
        
        if game_mode == 'bot':
            # Bot vs Bot mode
            player_bot_id = data.get('player_bot_id')
            opponent_bot_id = data.get('opponent_bot_id')
            hands_to_play = data.get('hands_to_play', 100)
            
            if not player_bot_id or not opponent_bot_id:
                return JsonResponse({'error': 'Both bots must be specified for bot vs bot mode'}, status=400)
            
            try:
                player_bot = BotRepository.objects.get(id=player_bot_id)
                opponent_bot = BotRepository.objects.get(id=opponent_bot_id)
            except BotRepository.DoesNotExist:
                return JsonResponse({'error': 'One or both bots not found'}, status=404)
            
            # Create session for bot vs bot
            session = GameSession.objects.create(
                session_id=str(uuid.uuid4()),
                player=player,
                play_mode='bot',
                player_bot=player_bot,
                opponent_bot=opponent_bot,
                hands_to_play=hands_to_play,
                player_stack=200,
                bot_stack=200,
                current_coins=0
            )
        else:
            # Human vs Bot mode
            opponent_bot_id = data.get('opponent_bot_id')
            opponent_bot = None
            
            if opponent_bot_id:
                try:
                    opponent_bot = BotRepository.objects.get(id=opponent_bot_id)
                except BotRepository.DoesNotExist:
                    pass
            
            # Create session for human vs bot
            session = GameSession.objects.create(
                session_id=str(uuid.uuid4()),
                player=player,
                play_mode='human',
                opponent_bot=opponent_bot,
                hands_to_play=1,  # Ongoing for human games
                player_stack=200,
                bot_stack=200,
                current_coins=0
            )
        
        return JsonResponse({
            'session_id': session.session_id,
            'mode': game_mode,
            'message': 'Game initialized successfully'
        })
        
    except Exception as e:
        logger.error(f"Error initializing game: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def join_game(request):
    """Join an existing game or start a new hand"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id:
            return JsonResponse({'error': 'Session ID required'}, status=400)
        
        session = get_object_or_404(GameSession, session_id=session_id, player=request.user)
        game_manager = PokerGameManager(session)
        
        # Start a new hand
        continue_session = session.hands_played > 0
        game_state = game_manager.start_new_hand(continue_session=continue_session)
        
        return JsonResponse(game_state)
        
    except Exception as e:
        logger.error(f"Error joining game: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def post_bot(request):
    """Post a new bot to the repository"""
    try:
        data = json.loads(request.body)
        
        bot_name = data.get('botName')
        description = data.get('description', '')
        
        if not bot_name:
            return JsonResponse({'error': 'Bot name is required'}, status=400)
        
        # Create bot repository entry
        bot = BotRepository.objects.create(
            name=bot_name,
            description=description,
            created_by=request.user,
            is_public=True
        )
        
        return JsonResponse({
            'message': 'Bot posted successfully',
            'bot_id': bot.id
        })
        
    except Exception as e:
        logger.error(f"Error posting bot: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
def get_available_games_api(request):
    """Get list of available games/bots"""
    try:
        # Get available bots
        bots = BotRepository.objects.filter(is_public=True).select_related('created_by')
        
        games_data = []
        for bot in bots:
            games_data.append({
                'id': bot.id,
                'botName': bot.name,
                'player': f"{bot.created_by.first_name} {bot.created_by.last_name}",
                'university': getattr(bot.created_by, 'university', 'Unknown'),
                'description': bot.description,
                'status': 'waiting'
            })
        
        return JsonResponse({'games': games_data})
        
    except Exception as e:
        logger.error(f"Error getting available games: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def make_move(request):
    """Process a player's move in the game"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        action_type = data.get('action_type')
        amount = data.get('amount', 0)
        
        if not session_id or not action_type:
            return JsonResponse({'error': 'Session ID and action type required'}, status=400)
        
        session = get_object_or_404(GameSession, session_id=session_id, player=request.user)
        game_manager = PokerGameManager(session)
        
        # Process the action
        response = game_manager.process_player_action(action_type, amount)
        
        return JsonResponse(response)
        
    except Exception as e:
        logger.error(f"Error processing move: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def start_hand(request):
    """Start a new hand of poker"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id:
            return JsonResponse({'error': 'Session ID required'}, status=400)
        
        session = get_object_or_404(GameSession, session_id=session_id, player=request.user)
        game_manager = PokerGameManager(session)
        
        # Start new hand, continuing the session
        continue_session = session.hands_played > 0 or session.play_mode == 'bot'
        game_state = game_manager.start_new_hand(continue_session=continue_session)
        
        return JsonResponse(game_state)
        
    except Exception as e:
        logger.error(f"Error starting hand: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def buy_in(request):
    """Process buy-in for human vs bot games"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id:
            return JsonResponse({'error': 'Session ID required'}, status=400)
        
        session = get_object_or_404(GameSession, session_id=session_id, player=request.user)
        game_manager = PokerGameManager(session)
        
        # Validate and process buy-in
        if not game_manager.validate_buy_in():
            return JsonResponse({'error': 'Insufficient coins for buy-in'}, status=400)
        
        success, message = game_manager.process_buy_in()
        
        if success:
            return JsonResponse({'message': message})
        else:
            return JsonResponse({'error': message}, status=400)
        
    except Exception as e:
        logger.error(f"Error processing buy-in: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def exit_game(request):
    """Exit the game and return remaining coins"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id:
            return JsonResponse({'error': 'Session ID required'}, status=400)
        
        session = get_object_or_404(GameSession, session_id=session_id, player=request.user)
        game_manager = PokerGameManager(session)
        
        # Process exit and return coins
        returned_coins = game_manager.process_exit_game()
        
        return JsonResponse({
            'message': 'Game exited successfully',
            'returned_coins': returned_coins
        })
        
    except Exception as e:
        logger.error(f"Error exiting game: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

# Development environment views
@csrf_exempt
@require_POST
@login_required
def save_code(request):
    """Save code to the development environment"""
    try:
        data = json.loads(request.body)
        filename = data.get('filename', 'player.py')
        code_content = data.get('content', '')
        
        # Create user-specific directory
        user_dir = os.path.join(settings.MEDIA_ROOT, 'user_code', str(request.user.id))
        os.makedirs(user_dir, exist_ok=True)
        
        # Save the file
        file_path = os.path.join(user_dir, filename)
        with open(file_path, 'w') as f:
            f.write(code_content)
        
        return JsonResponse({'message': 'Code saved successfully'})
        
    except Exception as e:
        logger.error(f"Error saving code: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def run_code(request):
    """Run user code in a sandbox environment"""
    try:
        data = json.loads(request.body)
        code_content = data.get('content', '')
        
        # This is a placeholder for code execution
        # In a real implementation, you'd want to run this in a secure sandbox
        
        return JsonResponse({
            'output': 'Code execution not implemented yet',
            'errors': []
        })
        
    except Exception as e:
        logger.error(f"Error running code: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
def get_skeleton_files(request):
    """Get list of skeleton files for development"""
    try:
        skeleton_dir = os.path.join(settings.BASE_DIR, 'skeletons')
        
        if not os.path.exists(skeleton_dir):
            return JsonResponse({'files': []})
        
        files = []
        for filename in os.listdir(skeleton_dir):
            if filename.endswith('.py'):
                files.append(filename)
        
        return JsonResponse({'files': files})
        
    except Exception as e:
        logger.error(f"Error getting skeleton files: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
def get_skeleton_file_content(request, path):
    """Get content of a skeleton file"""
    try:
        skeleton_dir = os.path.join(settings.BASE_DIR, 'skeletons')
        file_path = os.path.join(skeleton_dir, path)
        
        # Security check to prevent directory traversal
        if not file_path.startswith(skeleton_dir):
            return JsonResponse({'error': 'Invalid file path'}, status=400)
        
        if not os.path.exists(file_path):
            return JsonResponse({'error': 'File not found'}, status=404)
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        return JsonResponse({'content': content})
        
    except Exception as e:
        logger.error(f"Error getting skeleton file content: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

# Bot game simulation views
@csrf_exempt
@require_POST
@login_required
def start_bot_game_simulation(request):
    """Start a bot vs bot game simulation"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id:
            return JsonResponse({'error': 'Session ID required'}, status=400)
        
        session = get_object_or_404(GameSession, session_id=session_id, player=request.user)
        
        # Ensure this is a bot vs bot game
        if session.play_mode != 'bot':
            return JsonResponse({'error': 'Session is not a bot vs bot game'}, status=400)
        
        # Start the simulation
        success = start_bot_game(session_id)
        
        if success:
            return JsonResponse({'message': 'Bot game simulation started'})
        else:
            return JsonResponse({'error': 'Failed to start simulation'}, status=500)
        
    except Exception as e:
        logger.error(f"Error starting bot game simulation: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def pause_bot_game_simulation(request):
    """Pause a running bot game simulation"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id:
            return JsonResponse({'error': 'Session ID required'}, status=400)
        
        session = get_object_or_404(GameSession, session_id=session_id, player=request.user)
        
        # Stop the simulation
        success = stop_bot_game(session_id)
        
        if success:
            return JsonResponse({'message': 'Bot game simulation paused'})
        else:
            return JsonResponse({'error': 'Failed to pause simulation'}, status=500)
        
    except Exception as e:
        logger.error(f"Error pausing bot game simulation: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
@login_required
def get_bot_game_progress(request):
    """Get progress of a bot game simulation"""
    try:
        session_id = request.GET.get('session_id')
        
        if not session_id:
            return JsonResponse({'error': 'Session ID required'}, status=400)
        
        session = get_object_or_404(GameSession, session_id=session_id, player=request.user)
        
        # Get simulation status
        is_running, hands_played, error = get_bot_game_status(session_id)
        
        return JsonResponse({
            'is_running': is_running,
            'hands_played': hands_played,
            'hands_to_play': session.hands_to_play,
            'player_stack': session.player_stack,
            'bot_stack': session.bot_stack,
            'error': error
        })
        
    except Exception as e:
        logger.error(f"Error getting bot game progress: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
@login_required
def get_user_bots(request):
    """Get bots created by the current user"""
    try:
        bots = BotRepository.objects.filter(created_by=request.user)
        
        bots_data = []
        for bot in bots:
            bots_data.append({
                'id': bot.id,
                'name': bot.name,
                'description': bot.description,
                'created_at': bot.created_at.isoformat() if hasattr(bot, 'created_at') else None
            })
        
        return JsonResponse({'bots': bots_data})
        
    except Exception as e:
        logger.error(f"Error getting user bots: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
def get_available_opponent_bots(request):
    """Get available bots that can be used as opponents"""
    try:
        # Get all public bots
        bots = BotRepository.objects.filter(is_public=True).select_related('created_by')
        
        bots_data = []
        for bot in bots:
            bots_data.append({
                'id': bot.id,
                'name': bot.name,
                'description': bot.description,
                'created_by': f"{bot.created_by.first_name} {bot.created_by.last_name}",
                'created_at': bot.created_at.isoformat() if hasattr(bot, 'created_at') else None
            })
        
        return JsonResponse({'bots': bots_data})
        
    except Exception as e:
        logger.error(f"Error getting opponent bots: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def start_bot_vs_bot_game(request):
    """Start a new bot vs bot game"""
    try:
        data = json.loads(request.body)
        
        player_bot_id = data.get('player_bot_id')
        opponent_bot_id = data.get('opponent_bot_id')
        hands_to_play = data.get('hands_to_play', 100)
        
        if not player_bot_id or not opponent_bot_id:
            return JsonResponse({'error': 'Both bots must be specified'}, status=400)
        
        try:
            player_bot = BotRepository.objects.get(id=player_bot_id)
            opponent_bot = BotRepository.objects.get(id=opponent_bot_id)
        except BotRepository.DoesNotExist:
            return JsonResponse({'error': 'One or both bots not found'}, status=404)
        
        # Create new game session
        session = GameSession.objects.create(
            session_id=str(uuid.uuid4()),
            player=request.user,
            play_mode='bot',
            player_bot=player_bot,
            opponent_bot=opponent_bot,
            hands_to_play=hands_to_play,
            player_stack=200,
            bot_stack=200,
            current_coins=0,
            hands_played=0
        )
        
        # Initialize the game
        game_manager = PokerGameManager(session)
        game_state = game_manager.start_new_hand(continue_session=False)
        
        # Start the simulation if requested
        auto_start = data.get('auto_start', True)
        if auto_start:
            start_bot_game(session.session_id)
        
        return JsonResponse({
            'session_id': session.session_id,
            'game_state': game_state,
            'message': 'Bot vs bot game started successfully'
        })
        
    except Exception as e:
        logger.error(f"Error starting bot vs bot game: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)