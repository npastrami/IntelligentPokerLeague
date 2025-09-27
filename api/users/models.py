# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    university = models.CharField(max_length=100)
    major = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    github = models.URLField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    games_played = models.IntegerField(default=0)
    games_won = models.IntegerField(default=0)
    coins = models.IntegerField(default=10000)  # Starting coins
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    @property
    def win_rate(self):
        if self.games_played == 0:
            return 0
        return round((self.games_won / self.games_played) * 100, 1)

    def add_coins(self, amount):
        """Add coins to user's account"""
        self.coins += amount
        self.save()
        return self.coins

    def remove_coins(self, amount):
        """Remove coins from user's account"""
        if self.coins >= amount:
            self.coins -= amount
            self.save()
            return self.coins
        else:
            raise ValueError("Insufficient coins")

    def __str__(self):
        return self.email