from django.contrib import admin
from .models import PokerBot, BotFile, BotTemplate


@admin.register(PokerBot)
class PokerBotAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'language', 'is_active', 'updated_at', 'last_tested')
    list_filter = ('language', 'is_active', 'created_at')
    search_fields = ('name', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('user', 'name', 'description', 'language', 'is_active')
        }),
        ('Code', {
            'fields': ('code',),
            'classes': ('wide',)
        }),
        ('Testing', {
            'fields': ('last_tested', 'test_results'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(BotFile)
class BotFileAdmin(admin.ModelAdmin):
    list_display = ('filename', 'bot', 'file_type', 'updated_at')
    list_filter = ('file_type', 'created_at')
    search_fields = ('filename', 'bot__name', 'bot__user__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(BotTemplate)
class BotTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'difficulty_level', 'language', 'is_public', 'created_by', 'created_at')
    list_filter = ('difficulty_level', 'language', 'is_public', 'created_at')
    search_fields = ('name', 'description', 'created_by__username')
    readonly_fields = ('created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'difficulty_level', 'language', 'is_public', 'created_by')
        }),
        ('Template Code', {
            'fields': ('code',),
            'classes': ('wide',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )