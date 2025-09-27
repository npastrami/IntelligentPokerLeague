from django.contrib import admin
from .models import Team, TeamMember, TeamInvitation


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'member_count', 'max_members', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'owner__username')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'owner')
        }),
        ('Settings', {
            'fields': ('max_members', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'role', 'joined_at')
    list_filter = ('role', 'joined_at')
    search_fields = ('user__username', 'team__name')
    readonly_fields = ('joined_at',)


@admin.register(TeamInvitation)
class TeamInvitationAdmin(admin.ModelAdmin):
    list_display = ('invited_user', 'team', 'invited_by', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('invited_user__username', 'team__name', 'invited_by__username')
    readonly_fields = ('created_at', 'responded_at')
    
    fieldsets = (
        (None, {
            'fields': ('team', 'invited_by', 'invited_user', 'message')
        }),
        ('Status', {
            'fields': ('status', 'created_at', 'responded_at')
        }),
    )