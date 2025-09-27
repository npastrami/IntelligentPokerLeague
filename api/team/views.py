from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import IntegrityError
import json
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from .models import Team, TeamMember, TeamInvitation
from django.contrib.auth import get_user_model
User = get_user_model()

def team(request):
    """Frontend page for teams"""
    return JsonResponse({'status': 'team_page'})


@csrf_exempt
@require_http_methods(["GET"])
def team_list_api(request):
    """List all teams"""
    try:
        teams = Team.objects.filter(is_active=True).select_related('owner').prefetch_related('members')
        
        teams_data = []
        for team in teams:
            teams_data.append({
                'id': team.id,
                'name': team.name,
                'description': team.description,
                'owner': team.owner.username,
                'member_count': team.member_count,
                'max_members': team.max_members,
                'is_full': team.is_full,
                'created_at': team.created_at.isoformat(),
            })
        
        return JsonResponse({
            'success': True,
            'teams': teams_data
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def team_detail_api(request, team_id):
    """Get team details"""
    try:
        team = get_object_or_404(Team, id=team_id, is_active=True)
        
        members_data = []
        for member in team.members.select_related('user'):
            members_data.append({
                'id': member.id,
                'username': member.user.username,
                'role': member.role,
                'joined_at': member.joined_at.isoformat(),
            })
        
        team_data = {
            'id': team.id,
            'name': team.name,
            'description': team.description,
            'owner': team.owner.username,
            'member_count': team.member_count,
            'max_members': team.max_members,
            'is_full': team.is_full,
            'created_at': team.created_at.isoformat(),
            'members': members_data,
        }
        
        return JsonResponse({
            'success': True,
            'team': team_data
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@authentication_classes([TokenAuthentication]) 
@permission_classes([IsAuthenticated])
def create_team_api(request):
    """Create a new team"""
    try:
        data = json.loads(request.body)
        user_id = request.user.id
        if not user_id:
            return JsonResponse({
                'success': False,
                'error': 'user_id required'
            }, status=400)

        user = get_object_or_404(User, id=user_id)

        # Create team
        team = Team.objects.create(
            name=data['name'],
            description=data.get('description', ''),
            owner=user,
            max_members=data.get('max_members', 10)
        )
        
        # Add owner as team member
        TeamMember.objects.create(
            team=team,
            user=user,
            role='owner'
        )
        
        return JsonResponse({
            'success': True,
            'team': {
                'id': team.id,
                'name': team.name,
                'description': team.description,
                'owner': team.owner.username,
                'member_count': team.member_count,
                'max_members': team.max_members,
                'created_at': team.created_at.isoformat(),
            }
        })
    except IntegrityError:
        return JsonResponse({
            'success': False,
            'error': 'Team name already exists'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def join_team_api(request, team_id):
    """Join a team"""
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'error': 'user_id required'
            }, status=400)
        
        user = get_object_or_404(User, id=user_id)
        team = get_object_or_404(Team, id=team_id, is_active=True)
        
        # Check if team is full
        if team.is_full:
            return JsonResponse({
                'success': False,
                'error': 'Team is full'
            }, status=400)
        
        # Check if user is already a member
        if TeamMember.objects.filter(team=team, user=user).exists():
            return JsonResponse({
                'success': False,
                'error': 'User is already a member of this team'
            }, status=400)
        
        # Add user to team
        member = TeamMember.objects.create(
            team=team,
            user=user,
            role='member'
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully joined {team.name}',
            'member': {
                'id': member.id,
                'username': member.user.username,
                'role': member.role,
                'joined_at': member.joined_at.isoformat(),
            }
        })
    except IntegrityError:
        return JsonResponse({
            'success': False,
            'error': 'User is already a member of this team'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def leave_team_api(request, team_id):
    """Leave a team"""
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'error': 'user_id required'
            }, status=400)
        
        user = get_object_or_404(User, id=user_id)
        team = get_object_or_404(Team, id=team_id)
        
        # Check if user is a member
        try:
            member = TeamMember.objects.get(team=team, user=user)
        except TeamMember.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'User is not a member of this team'
            }, status=400)
        
        # Owners cannot leave their own team
        if member.role == 'owner':
            return JsonResponse({
                'success': False,
                'error': 'Team owners cannot leave their team. Transfer ownership first.'
            }, status=400)
        
        # Remove user from team
        member.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully left {team.name}'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def invite_to_team_api(request, team_id):
    """Invite a user to team"""
    try:
        data = json.loads(request.body)
        inviter_id = data.get('inviter_id')
        invited_username = data.get('invited_username')
        message = data.get('message', '')
        
        if not inviter_id or not invited_username:
            return JsonResponse({
                'success': False,
                'error': 'inviter_id and invited_username required'
            }, status=400)
        
        inviter = get_object_or_404(User, id=inviter_id)
        team = get_object_or_404(Team, id=team_id, is_active=True)
        
        try:
            invited_user = User.objects.get(username=invited_username)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'User not found'
            }, status=404)
        
        # Check if inviter is a team member
        if not TeamMember.objects.filter(team=team, user=inviter).exists():
            return JsonResponse({
                'success': False,
                'error': 'Only team members can send invitations'
            }, status=403)
        
        # Check if team is full
        if team.is_full:
            return JsonResponse({
                'success': False,
                'error': 'Team is full'
            }, status=400)
        
        # Check if user is already a member
        if TeamMember.objects.filter(team=team, user=invited_user).exists():
            return JsonResponse({
                'success': False,
                'error': 'User is already a member of this team'
            }, status=400)
        
        # Check if invitation already exists
        if TeamInvitation.objects.filter(team=team, invited_user=invited_user, status='pending').exists():
            return JsonResponse({
                'success': False,
                'error': 'Invitation already sent to this user'
            }, status=400)
        
        # Create invitation
        invitation = TeamInvitation.objects.create(
            team=team,
            invited_by=inviter,
            invited_user=invited_user,
            message=message
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Invitation sent to {invited_username}',
            'invitation': {
                'id': invitation.id,
                'team_name': team.name,
                'invited_by': inviter.username,
                'invited_user': invited_user.username,
                'message': message,
                'created_at': invitation.created_at.isoformat(),
            }
        })
    except IntegrityError:
        return JsonResponse({
            'success': False,
            'error': 'Invitation already exists'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def list_invitations_api(request):
    """List user's invitations"""
    try:
        user_id = request.GET.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'error': 'user_id required'
            }, status=400)
        
        user = get_object_or_404(User, id=user_id)
        
        invitations = TeamInvitation.objects.filter(
            invited_user=user,
            status='pending'
        ).select_related('team', 'invited_by')
        
        invitations_data = []
        for invitation in invitations:
            # Check if invitation is expired
            if invitation.is_expired():
                invitation.status = 'expired'
                invitation.save()
                continue
                
            invitations_data.append({
                'id': invitation.id,
                'team': {
                    'id': invitation.team.id,
                    'name': invitation.team.name,
                    'description': invitation.team.description,
                    'member_count': invitation.team.member_count,
                    'max_members': invitation.team.max_members,
                },
                'invited_by': invitation.invited_by.username,
                'message': invitation.message,
                'created_at': invitation.created_at.isoformat(),
            })
        
        return JsonResponse({
            'success': True,
            'invitations': invitations_data
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def accept_invitation_api(request, invitation_id):
    """Accept team invitation"""
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'error': 'user_id required'
            }, status=400)
        
        user = get_object_or_404(User, id=user_id)
        invitation = get_object_or_404(TeamInvitation, id=invitation_id, invited_user=user)
        
        # Check if invitation is still pending
        if invitation.status != 'pending':
            return JsonResponse({
                'success': False,
                'error': 'Invitation is no longer valid'
            }, status=400)
        
        # Check if invitation is expired
        if invitation.is_expired():
            invitation.status = 'expired'
            invitation.save()
            return JsonResponse({
                'success': False,
                'error': 'Invitation has expired'
            }, status=400)
        
        # Check if team is full
        if invitation.team.is_full:
            return JsonResponse({
                'success': False,
                'error': 'Team is full'
            }, status=400)
        
        # Check if user is already a member
        if TeamMember.objects.filter(team=invitation.team, user=user).exists():
            return JsonResponse({
                'success': False,
                'error': 'User is already a member of this team'
            }, status=400)
        
        # Accept invitation
        invitation.status = 'accepted'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        # Add user to team
        member = TeamMember.objects.create(
            team=invitation.team,
            user=user,
            role='member'
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully joined {invitation.team.name}',
            'team': {
                'id': invitation.team.id,
                'name': invitation.team.name,
                'description': invitation.team.description,
            }
        })
    except IntegrityError:
        return JsonResponse({
            'success': False,
            'error': 'User is already a member of this team'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def decline_invitation_api(request, invitation_id):
    """Decline team invitation"""
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'error': 'user_id required'
            }, status=400)
        
        user = get_object_or_404(User, id=user_id)
        invitation = get_object_or_404(TeamInvitation, id=invitation_id, invited_user=user)
        
        # Check if invitation is still pending
        if invitation.status != 'pending':
            return JsonResponse({
                'success': False,
                'error': 'Invitation is no longer valid'
            }, status=400)
        
        # Decline invitation
        invitation.status = 'declined'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Invitation to {invitation.team.name} declined'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)