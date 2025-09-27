import os
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import CustomUser
from poker.models import BotRepository

class Command(BaseCommand):
    help = 'Load example bots into the database'

    def handle(self, *args, **options):
        # Create test user
        test_user, created = CustomUser.objects.get_or_create(
            email='stu.ungar@example.com',
            defaults={
                'username': 'stungar',
                'first_name': 'Stu',
                'last_name': 'Ungar',
                'university': 'UNLV',
                'major': 'Computer Science',
                'is_active': True,
                'is_email_verified': True
            }
        )
        
        if created:
            test_user.set_password('testpassword')
            test_user.save()
            self.stdout.write(self.style.SUCCESS('Created test user'))

        # Read the Monte Carlo bot code
        bot_path = os.path.join(settings.BASE_DIR, 'poker', 'example_bots', 'player_monte_carlo', 'player.py')
        
        try:
            with open(bot_path, 'r') as f:
                monte_carlo_code = f.read()
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'Bot file not found: {bot_path}'))
            return

        # Create bot
        bot, created = BotRepository.objects.get_or_create(
            name='Monte Carlo Bot',
            user=test_user,
            defaults={
                'description': 'Advanced Monte Carlo simulation bot with hand strength evaluation',
                'code': monte_carlo_code,
                'metadata': {
                    'file_path': 'poker/example_bots/player_monte_carlo/'
                },
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Created Monte Carlo Bot'))
        else:
            bot.code = monte_carlo_code
            bot.save()
            self.stdout.write(self.style.WARNING('Updated existing Monte Carlo Bot'))

        self.stdout.write(self.style.SUCCESS('Successfully loaded bot'))