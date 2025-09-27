from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

User = get_user_model()


class PokerBot(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='poker_bots')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    code = models.TextField(default='// Your poker bot code here\nclass PokerBot {\n  constructor(name) {\n    this.name = name;\n  }\n\n  get_action(game_state, round_state, active) {\n    // Your bot logic here\n    return "call";\n  }\n}\n\nmodule.exports = PokerBot;')
    language = models.CharField(max_length=20, default='javascript')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_tested = models.DateTimeField(null=True, blank=True)
    test_results = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ('user', 'name')
        ordering = ['-updated_at']

    def save(self, *args, **kwargs):
        # Limit to 5 bots per user
        if not self.pk:  # New bot
            user_bot_count = PokerBot.objects.filter(user=self.user).count()
            if user_bot_count >= 5:
                raise ValidationError("Users can only have up to 5 poker bots.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.name}"


class BotFile(models.Model):
    """For users who want to organize their bot code into multiple files"""
    bot = models.ForeignKey(PokerBot, on_delete=models.CASCADE, related_name='files')
    filename = models.CharField(max_length=100)
    content = models.TextField()
    file_type = models.CharField(max_length=20, default='javascript')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('bot', 'filename')

    def __str__(self):
        return f"{self.bot.name}/{self.filename}"


class BotTemplate(models.Model):
    """Pre-built bot templates for users to start with"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    code = models.TextField()
    language = models.CharField(max_length=20, default='javascript')
    difficulty_level = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced'),
        ],
        default='beginner'
    )
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name