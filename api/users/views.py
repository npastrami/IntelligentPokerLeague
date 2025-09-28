from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from django.urls import reverse
import json
from django.http import JsonResponse
from .models import CustomUser
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserProfileSerializer,
    PasswordChangeSerializer
)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate verification token
        verification_token = get_random_string(50)
        user.email_verification_token = verification_token
        user.is_email_verified = False
        user.save()
        
        # Send verification email
        # send_verification_email(user, verification_token, request)
        
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'message': 'User registered successfully. Please check your email to verify your account.',
            'token': token.key,
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def send_verification_email(user, token, request):
    """Send email verification link to user"""
    verification_url = f"{request.build_absolute_uri('/')[:-1]}/api/users/verify/{token}/"
    
    subject = 'Verify your Poker League account'
    message = f"""
    Hi {user.first_name},
    
    Welcome to Poker League! Please click the link below to verify your email address:
    
    {verification_url}
    
    If you didn't create this account, please ignore this email.
    
    Best regards,
    Poker League Team
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request, token):
    """Verify user email with token"""
    try:
        user = CustomUser.objects.get(email_verification_token=token)
        user.is_email_verified = True
        user.email_verification_token = None
        user.save()
        
        return Response({
            'message': 'Email verified successfully!'
        }, status=status.HTTP_200_OK)
        
    except CustomUser.DoesNotExist:
        return Response({
            'error': 'Invalid verification token'
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    serializer = UserLoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        login(request, user)
        return Response({
            'message': 'Login successful',
            'token': token.key,
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    try:
        request.user.auth_token.delete()
    except:
        pass
    logout(request)
    return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    if request.method == 'GET':
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
        
    elif request.method == 'PUT':
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        # Delete old token and create new one
        user.auth_token.delete()
        token = Token.objects.create(user=user)
        return Response({
            'message': 'Password changed successfully',
            'token': token.key
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def user_stats(request):
    """Get general user statistics for the leaderboard"""
    total_users = CustomUser.objects.count()
    active_users = CustomUser.objects.filter(games_played__gt=0).count()
        
    return Response({
        'total_users': total_users,
        'active_users': active_users,
    })
    
@csrf_exempt
@require_http_methods(["POST"])
def add_coins(request):
    """Add coins to user's account"""
    try:
        # Get token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Token '):
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        
        # Parse request data
        data = json.loads(request.body)
        amount = data.get('amount', 10000)  # Default to 10000 coins
        
        # Add coins
        new_balance = user.add_coins(amount)
        
        return JsonResponse({
            'message': f'Added {amount} coins successfully',
            'coins': new_balance,
            'amount_added': amount
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cashout_game(request):
    """Handle game cashout - add remaining stack to user's coins"""
    try:
        from poker.models import GameSession
        from poker.manager import PokerGameManager
        
        # Get session ID from request
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'error': 'Session ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the game session
        try:
            session = GameSession.objects.get(session_id=session_id, player=request.user)
        except GameSession.DoesNotExist:
            return Response({'error': 'Game session not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Initialize game manager and process exit
        game_manager = PokerGameManager(session)
        returned_coins = game_manager.process_exit_game()
        
        # Refresh user data from database
        request.user.refresh_from_db()
        
        return Response({
            'message': f'Successfully cashed out {returned_coins} coins',
            'returned_coins': returned_coins,
            'user': UserProfileSerializer(request.user).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)