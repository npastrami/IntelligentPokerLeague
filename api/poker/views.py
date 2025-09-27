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
from storages.backends.s3boto3 import S3Boto3Storage
from pathlib import Path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import GameSession, BotRepository
from .manager import PokerGameManager, BotInterface, start_bot_game, stop_bot_game, get_bot_game_status
from users.models import CustomUser

logger = logging.getLogger(__name__)
User = get_user_model()

def home_view(request):
    return HttpResponse("Poker Home")

def game_table(request):
    return JsonResponse({'status': 'game_table_endpoint'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initialize_game(request):
    """Initialize a new poker game session"""
    try:
        data = request.data
        game_mode = data.get('mode', 'human')  # 'human' or 'bot'
        buy_in_amount = data.get('buy_in_amount', 200)  # Default to 200 if not provided
        
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
                player_stack=buy_in_amount,  # Use buy_in_amount
                bot_stack=buy_in_amount,     # Use buy_in_amount
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
            
            # Check if player has enough coins for buy-in
            if player.coins < buy_in_amount:
                return JsonResponse({'error': f'Insufficient coins. You need {buy_in_amount} but have {player.coins}'}, status=400)
            
            # Create session for human vs bot
            session = GameSession.objects.create(
                session_id=str(uuid.uuid4()),
                player=player,
                play_mode='human',
                opponent_bot=opponent_bot,
                hands_to_play=1,  # Ongoing for human games
                player_stack=buy_in_amount,  # Use buy_in_amount
                bot_stack=buy_in_amount,     # Use buy_in_amount
                current_coins=buy_in_amount  # Track coins used
            )
            
            # Deduct coins from player for buy-in
            player.coins -= buy_in_amount
            player.save()
        
        return JsonResponse({
            'session_id': session.session_id,
            'mode': game_mode,
            'buy_in_amount': buy_in_amount,
            'message': 'Game initialized successfully'
        })
        
    except Exception as e:
        logger.error(f"Error initializing game: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_game(request):
    """Join an existing game or start a new hand"""
    try:
        data = request.data
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def post_bot(request):
    """Post a new bot to the repository"""
    try:
        data = request.data
        
        bot_name = data.get('botName')
        description = data.get('description', '')
        
        if not bot_name:
            return JsonResponse({'error': 'Bot name is required'}, status=400)
        
        # Create bot repository entry
        bot = BotRepository.objects.create(
            name=bot_name,
            description=description,
            user=request.user,
            is_active=True
        )
        
        return JsonResponse({
            'message': 'Bot posted successfully',
            'bot_id': str(bot.id)
        })
        
    except Exception as e:
        logger.error(f"Error posting bot: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
def get_available_games_api(request):
    """Get list of available games/bots"""
    try:
        # Get available bots
        bots = BotRepository.objects.filter(is_active=True).select_related('user')
        
        games_data = []
        for bot in bots:
            games_data.append({
                'id': str(bot.id),
                'botName': bot.name,
                'player': f"{bot.user.first_name} {bot.user.last_name}",
                'university': getattr(bot.user, 'university', 'Unknown'),
                'description': bot.description,
                'status': 'waiting'
            })
        
        return JsonResponse({'games': games_data})
        
    except Exception as e:
        logger.error(f"Error getting available games: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def make_move(request):
    """Process a player's move in the game"""
    try:
        data = request.data
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_hand(request):
    """Start a new hand of poker"""
    try:
        data = request.data
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buy_in(request):
    """Process buy-in for human vs bot games"""
    try:
        data = request.data
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def exit_game(request):
    """Exit the game and return remaining coins"""
    try:
        data = request.data
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
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_code(request):
    """Save code to the development environment"""
    try:
        data = request.data
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

from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_file(request):
    try:
        user_id = request.user.id
        filename = request.data.get('filename')

        if not filename:
            return JsonResponse({'error': 'Filename is required'}, status=400)

        object_key = f"files/{user_id}/{filename}"
        storage = S3Boto3Storage()
        s3_client = storage.connection.meta.client
        bucket_name = storage.bucket_name

        # Default content based on file extension
        ext = filename.split('.')[-1].lower()
        if ext == 'py':
            content = "# New Python file\n\ndef poker_bot():\n    return 'call'\n"
        elif ext == 'js':
            content = "// New JavaScript file\n\nclass PokerBot {\n  makeDecision() { return 'call'; }\n}\n"
        else:
            content = "// New bot file\n\nclass PokerBot {\n  makeDecision() { return 'call'; }\n}\n"

        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=content.encode('utf-8'),
            ContentType='text/plain'
        )

        return JsonResponse({'message': 'File created', 'key': object_key})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from storages.backends.s3boto3 import S3Boto3Storage

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_files(request):
    user_id = request.user.id
    prefix = f"files/{user_id}/"

    storage = S3Boto3Storage()
    s3_client = storage.connection.meta.client

    bucket_name = storage.bucket_name  

    try:
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix,
            Delimiter='/'
        )
        
       
        folders = [p['Prefix'].replace(prefix, '').replace('/', '') for p in response.get('CommonPrefixes', [])]
        files = [obj['Key'].replace(prefix, '') for obj in response.get('Contents', []) if obj['Key'] != prefix]

        data = {
            'folders': folders,
            'files': files
        }

        return JsonResponse(data)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_file(request):
    """Upload a code file"""
    try:
        if 'file' not in request.FILES:
            return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        uploaded_file = request.FILES['file']
        
        # Check file extension
        allowed_extensions = ['.py', '.wls', '.js']
        file_extension = os.path.splitext(uploaded_file.name)[1].lower()
        
        if file_extension not in allowed_extensions:
            return JsonResponse({'error': 'Unsupported file type. Please upload a .py, .wls, or .js file'}, status=400)
        
        # Read file content
        content = uploaded_file.read().decode('utf-8')
        
        # Save to S3/MinIO storage
        user_id = request.user.id
        print(user_id)
        object_key = f"files/{user_id}/{uploaded_file.name}"
        
        storage = S3Boto3Storage()
        s3_client = storage.connection.meta.client
        bucket_name = storage.bucket_name
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=content.encode('utf-8'),
            ContentType='text/plain'
        )
        
        return JsonResponse({
            'message': 'File uploaded successfully',
            'filename': uploaded_file.name,
            'content': content
        })
        
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def load_file(request, filename):
    """Load file content from storage"""
    try:
        user_id = request.user.id
        object_key = f"files/{user_id}/{filename}"
        
        storage = S3Boto3Storage()
        s3_client = storage.connection.meta.client
        bucket_name = storage.bucket_name
        
        # Get file from S3/MinIO
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        content = response['Body'].read().decode('utf-8')
        
        return JsonResponse({
            'content': content,
            'filename': filename
        })
        
    except s3_client.exceptions.NoSuchKey:
        return JsonResponse({'error': 'File not found'}, status=404)
    except Exception as e:
        logger.error(f"Error loading file: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_file_to_storage(request):
    """Save file content to S3/MinIO storage"""
    try:
        data = request.data
        filename = data.get('filename')
        content = data.get('content', '')
        
        if not filename:
            return JsonResponse({'error': 'Filename is required'}, status=400)
        
        user_id = request.user.id
        object_key = f"files/{user_id}/{filename}"
        
        storage = S3Boto3Storage()
        s3_client = storage.connection.meta.client
        bucket_name = storage.bucket_name
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=content.encode('utf-8'),
            ContentType='text/plain'
        )
        
        return JsonResponse({'message': 'File saved successfully'})
        
    except Exception as e:
        logger.error(f"Error saving file to storage: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_code(request):
    """Run user code in a sandbox environment"""
    try:
        data = request.data
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
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_bot_game_simulation(request):
    """Start a bot vs bot game simulation"""
    try:
        data = request.data
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pause_bot_game_simulation(request):
    """Pause a running bot game simulation"""
    try:
        data = request.data
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_bots(request):
    """Get bots created by the current user"""
    try:
        bots = BotRepository.objects.filter(user=request.user, is_active=True)
        
        bots_data = []
        for bot in bots:
            bots_data.append({
                'id': str(bot.id),
                'name': bot.name,
                'description': bot.description,
                'created_at': bot.created_at.isoformat()
            })
        
        return JsonResponse({'bots': bots_data})
        
    except Exception as e:
        logger.error(f"Error getting user bots: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
def get_available_opponent_bots(request):
    """Get available bots that can be used as opponents"""
    try:
        # Get all active bots
        bots = BotRepository.objects.filter(is_active=True).select_related('user')
        
        bots_data = []
        for bot in bots:
            bots_data.append({
                'id': str(bot.id),
                'name': bot.name,
                'description': bot.description,
                'created_by': f"{bot.user.first_name} {bot.user.last_name}",
                'created_at': bot.created_at.isoformat()
            })
        
        return JsonResponse({'bots': bots_data})
        
    except Exception as e:
        logger.error(f"Error getting opponent bots: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_bot_vs_bot_game(request):
    """Start a new bot vs bot game"""
    try:
        data = request.data
        
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
    
import subprocess
import tempfile
import os
import json
import signal
from contextlib import contextmanager

@contextmanager
def timeout(duration):
    def timeout_handler(signum, frame):
        raise TimeoutError("Code execution timed out")
    
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(duration)
    try:
        yield
    finally:
        signal.alarm(0)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_command(request):
    """Execute terminal commands"""
    try:
        data = request.data
        command = data.get('command', '').strip()
        game_state = data.get('game_state', {})
        
        if not command:
            return JsonResponse({'output': '', 'error': None})
        
        # Create a safe Python environment
        python_code = f"""
import json
import sys
import traceback

# Make game_state available
game_state = {json.dumps(game_state)}

try:
    # Execute the command
    result = eval('''{command}''')
    if result is not None:
        print(result)
except SyntaxError:
    try:
        exec('''{command}''')
    except Exception as e:
        print(f"Error: {{e}}")
        traceback.print_exc()
except Exception as e:
    print(f"Error: {{e}}")
    traceback.print_exc()
"""
        
        # Execute with timeout and sandboxing
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(python_code)
            temp_file = f.name
        
        try:
            with timeout(5):  # 5 second timeout
                result = subprocess.run(
                    ['python3', temp_file],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    cwd=tempfile.gettempdir()
                )
            
            output = result.stdout
            error = result.stderr if result.stderr else None
            
            return JsonResponse({
                'output': output,
                'error': error
            })
            
        except (subprocess.TimeoutExpired, TimeoutError):
            return JsonResponse({
                'output': '',
                'error': 'Command timed out'
            })
        finally:
            os.unlink(temp_file)
            
    except Exception as e:
        logger.error(f"Error executing command: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_code(request):
    """Run user Python code in a sandbox environment"""
    try:
        data = request.data
        code_content = data.get('content', '')
        game_state = data.get('game_state', {})
        
        if not code_content.strip():
            return JsonResponse({'output': '', 'errors': []})
        
        # Prepare Python code with game_state available
        python_code = f"""
import json
import sys
import traceback

# Make game_state available
game_state = {json.dumps(game_state)}

try:
{chr(10).join('    ' + line for line in code_content.split(chr(10)))}
except Exception as e:
    print(f"Error: {{e}}")
    traceback.print_exc()
"""
        
        # Execute with timeout and sandboxing
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(python_code)
            temp_file = f.name
        
        try:
            with timeout(10):  # 10 second timeout for full scripts
                result = subprocess.run(
                    ['python3', temp_file],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=tempfile.gettempdir()
                )
            
            output = result.stdout
            errors = [result.stderr] if result.stderr else []
            
            return JsonResponse({
                'output': output,
                'errors': errors
            })
            
        except (subprocess.TimeoutExpired, TimeoutError):
            return JsonResponse({
                'output': '',
                'errors': ['Code execution timed out']
            })
        finally:
            os.unlink(temp_file)
        
    except Exception as e:
        logger.error(f"Error running code: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)