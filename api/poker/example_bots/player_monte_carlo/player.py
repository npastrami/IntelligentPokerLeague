'''
Simple example pokerbot, written in Python.
'''
from skeleton.actions import FoldAction, CallAction, CheckAction, RaiseAction
from skeleton.states import GameState, TerminalState, RoundState
from skeleton.states import NUM_ROUNDS, STARTING_STACK, BIG_BLIND, SMALL_BLIND
from skeleton.bot import Bot
from skeleton.runner import parse_args, run_bot

import eval7
import random


class Player(Bot):
    '''
    A pokerbot.
    '''

    def __init__(self):
        '''
        Called when a new game starts. Called exactly once.

        Arguments:
        Nothing.

        Returns:
        Nothing.
        '''
        pass


    def calc_strength(self, hole_str_list, board_str_list, iterations):
        '''
        Monte Carlo simulation to estimate hand strength.
        Args:
            hole_str_list: List of two card strings for the player's hole cards (e.g., ['As', 'Kd'])
            board_str_list: List of card strings for cards already on the board (e.g., ['Ks', 'Qh', 'Jd'])
            iterations: Number of simulations to run
        Returns:
            Estimated hand strength (0 to 1)
        '''

        deck = eval7.Deck()
        hole_cards = [eval7.Card(card_str) for card_str in hole_str_list]
        board_cards = [eval7.Card(card_str) for card_str in board_str_list]

        # Remove known cards (player's hole cards and current board cards) from the deck
        for card in hole_cards:
            if card in deck.cards:
                deck.cards.remove(card)
        for card in board_cards:
            if card in deck.cards:
                deck.cards.remove(card)

        score = 0
        num_opponent_hole_cards = 2
        num_community_cards_to_deal = 5 - len(board_cards)

        if iterations == 0: # Prevent division by zero later
            return 0

        for _ in range(iterations):
            deck.shuffle()

            # Determine how many cards to draw for opponent and remaining community
            cards_to_draw_count = num_opponent_hole_cards + num_community_cards_to_deal

            drawn_cards = deck.peek(cards_to_draw_count)

            opp_hole_sim = drawn_cards[:num_opponent_hole_cards]
            
            # Simulated community cards are only those not already on the board
            simulated_community_cards = []
            if num_community_cards_to_deal > 0:
                simulated_community_cards = drawn_cards[num_opponent_hole_cards : num_opponent_hole_cards + num_community_cards_to_deal]

            # Full community board for this simulation run
            current_full_community = board_cards + simulated_community_cards

            our_hand = hole_cards + current_full_community
            opp_hand = opp_hole_sim + current_full_community

            our_value = eval7.evaluate(our_hand)
            opp_value = eval7.evaluate(opp_hand)

            if our_value > opp_value:
                score += 2
            elif our_value == opp_value:
                score += 1
            # else: score += 0 (no change)

        # hand_strength is the average score from simulations, normalized (max score is 2*iterations)
        hand_strength = score / (2 * iterations) if iterations > 0 else 0

        return hand_strength


    def handle_new_round(self, game_state, round_state, active):
        '''
        Called when a new round starts. Called NUM_ROUNDS times.

        Arguments:
        game_state: the GameState object.
        round_state: the RoundState object.
        active: your player's index.

        Returns:
        Nothing.
        '''
        my_bankroll = game_state.bankroll  # the total number of chips you've gained or lost from the beginning of the game to the start of this round
        game_clock = game_state.game_clock  # the total number of seconds your bot has left to play this game
        round_num = game_state.round_num  # the round number from 1 to NUM_ROUNDS
        my_cards = round_state.hands[active]  # your cards
        big_blind = bool(active)  # True if you are the big blind
        

    def handle_round_over(self, game_state, terminal_state, active):
        '''
        Called when a round ends. Called NUM_ROUNDS times.

        Arguments:
        game_state: the GameState object.
        terminal_state: the TerminalState object.
        active: your player's index.

        Returns:
        Nothing.
        '''
        my_delta = terminal_state.deltas[active]  # your bankroll change from this round
        previous_state = terminal_state.previous_state  # RoundState before payoffs
        street = previous_state.street  # int of street representing when this round ended
        my_cards = previous_state.hands[active]  # your cards
        opp_cards = previous_state.hands[1-active]  # opponent's cards or [] if not revealed
        

    def get_action(self, game_state, round_state, active):
        '''
        Where the magic happens - your code should implement this function.
        Called any time the engine needs an action from your bot.

        Arguments:
        game_state: the GameState object.
        round_state: the RoundState object.
        active: your player's index.

        Returns:
        Your action.
        '''
        legal_actions = round_state.legal_actions()  # the actions you are allowed to take
        street = round_state.street  # int representing pre-flop, flop, turn, or river respectively
        my_cards = round_state.hands[active]  # your cards
        board_cards = round_state.deck[:street]  # the board cards
        my_pip = round_state.pips[active]  # the number of chips you have contributed to the pot this round of betting
        opp_pip = round_state.pips[1-active]  # the number of chips your opponent has contributed to the pot this round of betting
        my_stack = round_state.stacks[active]  # the number of chips you have remaining
        opp_stack = round_state.stacks[1-active]  # the number of chips your opponent has remaining
        continue_cost = opp_pip - my_pip  # the number of chips needed to stay in the pot
        my_contribution = STARTING_STACK - my_stack  # the number of chips you have contributed to the pot
        opp_contribution = STARTING_STACK - opp_stack  # the number of chips your opponent has contributed to the pot
        
        

        
        min_raise, max_raise = round_state.raise_bounds()  # the smallest and largest numbers of chips for a legal bet/raise
        my_action = None


        pot_total = my_contribution + opp_contribution

        if street < 3:
            raise_amount = int(my_pip + continue_cost + 0.4 * (pot_total + continue_cost))
        else:
            raise_amount = int(my_pip + continue_cost + 0.75 * (pot_total + continue_cost))

        
        raise_amount = max([min_raise, raise_amount])

        raise_cost = raise_amount - my_pip


        if (RaiseAction in legal_actions and (raise_cost <= my_stack)):
            temp_action = RaiseAction(raise_amount)

        elif (CallAction in legal_actions and (continue_cost <= my_stack)):
            temp_action = CallAction()

        elif CheckAction in legal_actions: 
            temp_action = CheckAction()
        else:
            temp_action = FoldAction()


        MONTE_CARLO_ITERS = 100
        strength = self.calc_strength(my_cards, board_cards, MONTE_CARLO_ITERS)


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


if __name__ == '__main__':
    run_bot(Player(), parse_args())