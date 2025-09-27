from django.db import models
import uuid
from django.core.exceptions import ValidationError
from users.models import CustomUser

class BotRepository(models.Model):
    """Model for storing bot information and metadata"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='bots')
    name = models.CharField(max_length=50)
    code = models.TextField(blank=True)  # Optional code storage
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(null=True, blank=True, default=dict)  # Store file path and other metadata

    class Meta:
        db_table = 'bot_repository'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name'],
                name='unique_bot_name_per_user'
            )
        ]

    def clean(self):
        if not self.id:  # Only check on creation
            active_bots = BotRepository.objects.filter(
                user=self.user,
                is_active=True
            ).count()
            if active_bots >= 5:
                raise ValidationError("Users can only have 5 active bots at a time.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (by {self.user.username})"


class AvailableGame(models.Model):
    """Available games that players can join"""
    GAME_TYPES = (
        ('coins', 'Coins'),
        ('gems', 'Gems'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    bot = models.ForeignKey(
        BotRepository, 
        on_delete=models.CASCADE, 
        related_name='games',
        null=True,
        default=None
    )
    game_type = models.CharField(max_length=5, choices=GAME_TYPES)
    total_hands = models.IntegerField()
    remaining_hands = models.IntegerField()
    posted_on = models.DateTimeField(auto_now_add=True)
    initial_stack = models.IntegerField()
    max_rebuys = models.IntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'available_games'
        ordering = ['-posted_on']
    
    def __str__(self):
        return f"{self.user.username}'s {self.game_type} game ({self.remaining_hands}/{self.total_hands})"


class GameSession(models.Model):
    """Active game sessions - both human vs bot and bot vs bot"""
    PLAY_MODES = (
        ('human', 'Human vs Bot'),
        ('bot', 'Bot vs Bot'),
    )

    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    player = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True)
    play_mode = models.CharField(max_length=5, choices=PLAY_MODES, default='human')
    
    # Bots
    player_bot = models.ForeignKey(
        BotRepository, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='player_sessions'
    )
    opponent_bot = models.ForeignKey(
        BotRepository,
        on_delete=models.SET_NULL,
        null=True,
        related_name='opponent_sessions'
    )
    
    # Game state
    player_stack = models.IntegerField(default=0)
    bot_stack = models.IntegerField(default=0)
    current_street = models.CharField(max_length=20, default='preflop')
    pot = models.IntegerField(default=0)
    player_cards = models.JSONField(default=list)
    board_cards = models.JSONField(default=list)
    game_state = models.JSONField(default=dict)  # Serialized game state
    
    # Session metadata
    created_at = models.DateTimeField(auto_now_add=True)
    current_coins = models.IntegerField(default=0)
    available_game = models.ForeignKey(AvailableGame, on_delete=models.SET_NULL, null=True, blank=True)
    
    # For bot vs bot games
    hands_to_play = models.IntegerField(default=0)
    hands_played = models.IntegerField(default=0)
    player_initial_stack = models.IntegerField(default=0)
    bot_initial_stack = models.IntegerField(default=0)
    player_max_rebuys = models.IntegerField(default=0)
    simulation_running = models.BooleanField(default=False)

    class Meta:
        db_table = 'game_sessions'
    
    def __str__(self):
        if self.play_mode == 'human':
            return f"Human session: {self.player.username} vs Bot"
        else:
            p_bot = self.player_bot.name if self.player_bot else "Unknown"
            o_bot = self.opponent_bot.name if self.opponent_bot else "Unknown"
            return f"Bot session: {p_bot} vs {o_bot}"


class UserCode(models.Model):
    """User-saved code snippets"""
    user = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    code = models.TextField()
    language = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']