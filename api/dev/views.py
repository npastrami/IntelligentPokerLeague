from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required


def editor_view(request):
    """Main editor view - serves React app or redirects to frontend"""
    return JsonResponse({'status': 'editor_view', 'message': 'Monaco Editor Backend'})