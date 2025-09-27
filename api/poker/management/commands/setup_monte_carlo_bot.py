# poker/management/commands/setup_monte_carlo_bot.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from poker.models import BotRepository, AvailableGame
import os

User = get_user_model()

MONTE_CARLO_CODE = '''
# Monte Carlo bot implementation
from skeleton.actions import FoldAction, CallAction, CheckAction, RaiseAction
from skeleton.states import GameState, TerminalState, RoundState
from skeleton.states import NUM_ROUNDS, STARTING_STACK, BIG_BLIND, SMALL_BLIND
from skeleton.bot import Bot
import eval7
import random

class Player(Bot):
    """
    A Monte Carlo simulation based poker bot.
    """

    def __init__(self):
        self.name = "Monte_Carlo_Bot"

    def calc_strength(self, hole_str_list, board_str_list, iterations):
        """
        Monte Carlo simulation to estimate hand strength.
        """
        deck = eval7.Deck()
        hole_cards = [eval7.Card(card_str) for card_str in hole_str_list]
        board_cards = [eval7.Card(card_str) for card_str in board_str_list]

        # Remove known cards from deck
        for card in hole_cards:
            if card in deck.cards:
                deck.cards.remove(card)
        for card in board_cards:
            if card in deck.cards:
                deck.cards.remove(card)

        score = 0
        num_opponent_hole_cards = 2
        num_community_cards_to_deal = 5 - len(board_cards)

        if iterations == 0:
            return 0

        for _ in range(iterations):
            deck.shuffle()
            cards_to_draw_count = num_opponent_hole_cards + num_community_cards_to_deal
            drawn_cards = deck.peek(cards_to_draw_count)
            opp_hole_sim = drawn_cards[:num_opponent_hole_cards]
            
            simulated_community_cards = []
            if num_community_cards_to_deal > 0:
                simulated_community_cards = drawn_cards[num_opponent_hole_cards:num_opponent_hole_cards + num_community_cards_to_deal]

            current_full_community = board_cards + simulated_community_cards
            our_hand = hole_cards + current_full_community
            opp_hand = opp_hole_sim + current_full_community

            our_value = eval7.evaluate(our_hand)
            opp_value = eval7.evaluate(opp_hand)

            if our_value > opp_value:
                score += 2
            elif our_value == opp_value:
                score += 1

        hand_strength = score / (2 * iterations) if iterations > 0 else 0
        return hand_strength

    def handle_new_round(self, game_state, round_state, active):
        pass

    def handle_round_over(self, game_state, terminal_state, active):
        pass

    def get_action(self, game_state, round_state, active):
        legal_actions = round_state.legal_actions()
        street = round_state.street
        my_cards = round_state.hands[active]
        board_cards = round_state.deck[:street]
        my_pip = round_state.pips[active]
        opp_pip = round_state.pips[1-active]
        my_stack = round_state.stacks[active]
        opp_stack = round_state.stacks[1-active]
        continue_cost = opp_pip - my_pip
        my_contribution = STARTING_STACK - my_stack
        opp_contribution = STARTING_STACK - opp_stack
        
        min_raise, max_raise = round_state.raise_bounds()
        pot_total = my_contribution + opp_contribution

        # Calculate raise amount
        if street < 3:
            raise_amount = int(my_pip + continue_cost + 0.4 * (pot_total + continue_cost))
        else:
            raise_amount = int(my_pip + continue_cost + 0.75 * (pot_total + continue_cost))
        
        raise_amount = max([min_raise, raise_amount])
        raise_cost = raise_amount - my_pip

        # Determine preferred action
        if (RaiseAction in legal_actions and (raise_cost <= my_stack)):
            temp_action = RaiseAction(raise_amount)
        elif (CallAction in legal_actions and (continue_cost <= my_stack)):
            temp_action = CallAction()
        elif CheckAction in legal_actions:
            temp_action = CheckAction()
        else:
            temp_action = FoldAction()

        # Monte Carlo simulation
        MONTE_CARLO_ITERS = 100
        strength = self.calc_strength(my_cards, board_cards, MONTE_CARLO_ITERS)

        # Decision logic based on pot odds and hand strength
        if continue_cost > 0:
            scary = 0
            if continue_cost > 6:
                scary = 0.15
            if continue_cost > 12:
                scary = 0.25
            if continue_cost > 50:
                scary = 0.35

            strength = max([0, strength - scary])
            pot_odds = continue_cost / (pot_total + continue_cost)

            if strength > pot_odds:
                if random.random() < strength and strength > 0.5:
                    my_action = temp_action
                else:
                    my_action = CallAction()
            else:
                my_action = FoldAction()
        else:
            if random.random() < strength:
                my_action = temp_action
            else:
                my_action = CheckAction()

        return my_action
'''

class Command(BaseCommand):
    help = 'Sets up the default Monte Carlo bot and creates an available game'

    def handle(self, *args, **kwargs):
        # Create or get admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'is_staff': True,
                'is_superuser': True,
                'coins': 1000000,  # 1M coins for admin
                'email': 'admin@example.com'
            }
        )
        
        if created:
            admin_user.set_password('admin_password')  # Set a default password
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Created admin user'))

        # Create Monte Carlo bot in repository
        monte_carlo_bot, created = BotRepository.objects.get_or_create(
            user=admin_user,
            name='Monte_Carlo_Bot',
            defaults={
                'code': MONTE_CARLO_CODE,
                'description': 'Monte Carlo simulation poker bot using hand strength evaluation',
                'is_active': True
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('Created Monte Carlo bot in repository'))

        # Create available game for Monte Carlo bot
        game, created = AvailableGame.objects.get_or_create(
            user=admin_user,
            bot=monte_carlo_bot,
            defaults={
                'bot_name': 'Monte_Carlo_Bot',
                'game_type': 'coins',
                'total_hands': 100000,
                'remaining_hands': 100000,
                'initial_stack': 400,
                'max_rebuys': 250,  # Allow for long sessions
                'is_active': True
            }
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS('Created default Monte Carlo available game')
            )
        else:
            # Update existing game
            game.remaining_hands = 100000
            game.is_active = True
            game.save()
            self.stdout.write(
                self.style.SUCCESS('Updated existing Monte Carlo game')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nMonte Carlo bot setup complete!\n'
                f'Bot: {monte_carlo_bot.name}\n'
                f'Game ID: {game.id if hasattr(game, "id") else "N/A"}\n'
                f'Admin user: {admin_user.username} (password: admin_password)'
            )
        )