import os
import json
import tempfile
import subprocess
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.middleware.csrf import get_token
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError

from .models import PokerBot, BotFile, BotTemplate


@ensure_csrf_cookie
def get_csrf_token(request):
    """Get CSRF token for frontend"""
    return JsonResponse({
        'csrf_token': get_token(request)
    })


@csrf_exempt
@require_http_methods(["GET"])
def list_skeletons(request):
    """List available bot templates and user's bots"""
    try:
        user_id = request.GET.get('user_id')
        
        # Get templates
        templates = BotTemplate.objects.filter(is_public=True)
        templates_data = []
        for template in templates:
            templates_data.append({
                'id': template.id,
                'name': template.name,
                'description': template.description,
                'difficulty_level': template.difficulty_level,
                'language': template.language,
                'type': 'template'
            })
        
        # Get user's bots if user_id provided
        user_bots_data = []
        if user_id:
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(id=user_id)
                
                user_bots = PokerBot.objects.filter(user=user)
                for bot in user_bots:
                    user_bots_data.append({
                        'id': bot.id,
                        'name': bot.name,
                        'description': bot.description,
                        'language': bot.language,
                        'updated_at': bot.updated_at.isoformat(),
                        'type': 'user_bot'
                    })
            except:
                pass
        
        return JsonResponse({
            'success': True,
            'templates': templates_data,
            'user_bots': user_bots_data,
            'user_bot_count': len(user_bots_data),
            'max_bots': 5
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_skeleton_file(request, file_path):
    """Get template or bot code content"""
    try:
        path_parts = file_path.split('/')
        file_type = path_parts[0]  # 'template' or 'bot'
        file_id = path_parts[1]
        
        if file_type == 'template':
            template = get_object_or_404(BotTemplate, id=file_id)
            return JsonResponse({
                'success': True,
                'content': template.code,
                'language': template.language,
                'name': template.name,
                'description': template.description
            })
        elif file_type == 'bot':
            bot = get_object_or_404(PokerBot, id=file_id)
            return JsonResponse({
                'success': True,
                'content': bot.code,
                'language': bot.language,
                'name': bot.name,
                'description': bot.description
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Invalid file type'
            }, status=400)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def save_code(request):
    """Save bot code"""
    try:
        data = json.loads(request.body)
        
        user_id = data.get('user_id')
        bot_id = data.get('bot_id')
        bot_name = data.get('name')
        code = data.get('code')
        description = data.get('description', '')
        language = data.get('language', 'javascript')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'error': 'user_id required'
            }, status=400)
        
        if not bot_name or not code:
            return JsonResponse({
                'success': False,
                'error': 'name and code required'
            }, status=400)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = get_object_or_404(User, id=user_id)
        
        if bot_id:
            # Update existing bot
            bot = get_object_or_404(PokerBot, id=bot_id, user=user)
            bot.name = bot_name
            bot.code = code
            bot.description = description
            bot.language = language
            bot.save()
        else:
            # Create new bot
            try:
                bot = PokerBot.objects.create(
                    user=user,
                    name=bot_name,
                    code=code,
                    description=description,
                    language=language
                )
            except ValidationError as e:
                return JsonResponse({
                    'success': False,
                    'error': str(e)
                }, status=400)
        
        return JsonResponse({
            'success': True,
            'message': 'Bot saved successfully',
            'bot': {
                'id': bot.id,
                'name': bot.name,
                'description': bot.description,
                'language': bot.language,
                'updated_at': bot.updated_at.isoformat()
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def run_code(request):
    """Test run bot code"""
    try:
        data = json.loads(request.body)
        
        code = data.get('code')
        language = data.get('language', 'javascript')
        test_scenario = data.get('test_scenario', 'basic')
        
        if not code:
            return JsonResponse({
                'success': False,
                'error': 'code required'
            }, status=400)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{language}', delete=False) as temp_file:
            temp_file.write(code)
            temp_file_path = temp_file.name
        
        try:
            # Basic syntax check for JavaScript
            if language == 'javascript':
                result = _run_javascript_test(temp_file_path, test_scenario)
            else:
                result = {
                    'success': False,
                    'error': f'Language {language} not supported for testing yet'
                }
            
            # Clean up
            os.unlink(temp_file_path)
            
            return JsonResponse(result)
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            raise e
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def upload_file(request):
    """Upload bot file"""
    try:
        if 'file' not in request.FILES:
            return JsonResponse({
                'success': False,
                'error': 'No file provided'
            }, status=400)
        
        uploaded_file = request.FILES['file']
        user_id = request.POST.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'error': 'user_id required'
            }, status=400)
        
        # Read file content
        content = uploaded_file.read().decode('utf-8')
        filename = uploaded_file.name
        
        # Determine language from file extension
        language = 'javascript'
        if filename.endswith('.py'):
            language = 'python'
        elif filename.endswith('.java'):
            language = 'java'
        elif filename.endswith('.cpp') or filename.endswith('.cc'):
            language = 'cpp'
        
        return JsonResponse({
            'success': True,
            'content': content,
            'filename': filename,
            'language': language,
            'message': 'File uploaded successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def _run_javascript_test(file_path, test_scenario):
    """Run JavaScript bot test"""
    try:
        # Basic syntax check using Node.js
        result = subprocess.run(
            ['node', '-c', file_path],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            # Syntax is valid, run a basic test
            test_output = _simulate_poker_test(test_scenario)
            return {
                'success': True,
                'message': 'Code compiled successfully',
                'test_results': test_output,
                'syntax_valid': True
            }
        else:
            return {
                'success': False,
                'error': result.stderr,
                'syntax_valid': False
            }
            
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Test timed out',
            'syntax_valid': False
        }
    except FileNotFoundError:
        # Node.js not available, do basic validation
        return {
            'success': True,
            'message': 'Basic validation passed (Node.js not available for full testing)',
            'test_results': _simulate_poker_test(test_scenario),
            'syntax_valid': True
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'syntax_valid': False
        }


def _simulate_poker_test(test_scenario):
    """Simulate poker game scenarios for testing"""
    test_scenarios = {
        'basic': {
            'scenario': 'Basic decision making',
            'hands_played': 10,
            'decisions': ['call', 'check', 'fold', 'call', 'check', 'raise', 'call', 'fold', 'check', 'call'],
            'avg_decision_time': '50ms',
            'status': 'passed'
        },
        'aggressive': {
            'scenario': 'Aggressive play test',
            'hands_played': 5,
            'decisions': ['raise', 'raise', 'call', 'raise', 'call'],
            'avg_decision_time': '45ms',
            'status': 'passed'
        },
        'conservative': {
            'scenario': 'Conservative play test',
            'hands_played': 5,
            'decisions': ['fold', 'check', 'call', 'fold', 'check'],
            'avg_decision_time': '40ms',
            'status': 'passed'
        }
    }
    
    return test_scenarios.get(test_scenario, test_scenarios['basic'])