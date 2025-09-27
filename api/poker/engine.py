from collections import namedtuple
import eval7
import time
import os
from queue import Queue
from threading import Thread

# Game constants
SMALL_BLIND = 1
BIG_BLIND = 2
STARTING_STACK = 200
STREET_NAMES = ['Flop', 'Turn', 'River']
GAME_LOG_FILENAME = 'gamelog'
PLAYER_LOG_SIZE_LIMIT = 1024 * 1024  # 1MB log size limit

# Action types
FoldAction = namedtuple('FoldAction', [])
CallAction = namedtuple('CallAction', [])
CheckAction = namedtuple('CheckAction', [])
RaiseAction = namedtuple('RaiseAction', ['amount'])
TerminalState = namedtuple('TerminalState', ['deltas', 'previous_state'])

# Helper functions
CCARDS = lambda cards: ','.join(map(str, cards))
PCARDS = lambda cards: '[{}]'.format(' '.join(map(str, cards)))
PVALUE = lambda name, value: ', {} ({})'.format(name, value)
STATUS = lambda players: ''.join([PVALUE(p.name, p.bankroll) for p in players])

class RoundState(namedtuple('_RoundState', ['button', 'street', 'final_street', 'pips', 'stacks', 'hands', 'deck', 'previous_state'])):
    '''
    Encodes the game tree for one round of poker.
    '''
    def showdown(self):
        '''
        Compares the players' hands and computes payoffs.
        '''
        # Convert string cards back to eval7 Card objects for evaluation
        board_cards = [eval7.Card(card) for card in self.deck[:self.street]]
        hand0 = [eval7.Card(card) for card in self.hands[0]]
        hand1 = [eval7.Card(card) for card in self.hands[1]]
        
        score0 = eval7.evaluate(board_cards + hand0)
        score1 = eval7.evaluate(board_cards + hand1)
        
        if score0 > score1:
            delta = STARTING_STACK - self.stacks[1]
        elif score0 < score1:
            delta = self.stacks[0] - STARTING_STACK
        else:  # split the pot
            delta = (self.stacks[0] - self.stacks[1]) // 2
        return TerminalState([delta, -delta], self)

    def legal_actions(self):
        '''
        Returns a set which corresponds to the active player's legal moves.
        '''
        active = self.button % 2
        continue_cost = self.pips[1-active] - self.pips[active]
        if continue_cost == 0:
            bets_forbidden = (self.stacks[0] == 0 or self.stacks[1] == 0)
            return {CheckAction} if bets_forbidden else {CheckAction, RaiseAction}
        raises_forbidden = (continue_cost == self.stacks[active] or self.stacks[1-active] == 0)
        return {FoldAction, CallAction} if raises_forbidden else {FoldAction, CallAction, RaiseAction}

    def raise_bounds(self):
        '''
        Returns a tuple of the minimum and maximum legal raises.
        '''
        active = self.button % 2
        continue_cost = self.pips[1-active] - self.pips[active]
        max_contribution = min(self.stacks[active], self.stacks[1-active] + continue_cost)
        min_contribution = min(max_contribution, continue_cost + max(continue_cost, BIG_BLIND))
        return (self.pips[active] + min_contribution, self.pips[active] + max_contribution)

    def proceed_street(self):
        '''
        Resets the players' pips and advances the game tree to the next round of betting.
        '''
        if self.street == self.final_street:
            return self.showdown()
        new_street = 3 if self.street == 0 else self.street + 1
        return RoundState(1, new_street, self.final_street, [0, 0], self.stacks, self.hands, self.deck, self)

    def proceed(self, action):
        '''
        Advances the game tree by one action performed by the active player.
        '''
        active = self.button % 2
        
        if isinstance(action, FoldAction):
            delta = (self.stacks[0] - STARTING_STACK 
                    if active == 0 else STARTING_STACK - self.stacks[1])
            return TerminalState([delta, -delta], self)
        
        elif isinstance(action, CallAction):
            if self.button == 0:
                # sb calls bb
                return RoundState(
                    button=1,
                    street=0,
                    final_street=self.final_street,
                    pips=[BIG_BLIND] * 2,
                    stacks=[STARTING_STACK - BIG_BLIND] * 2,
                    hands=self.hands,
                    deck=self.deck,
                    previous_state=self
                )
            new_pips = list(self.pips)
            new_stacks = list(self.stacks)
            contribution = new_pips[1 - active] - new_pips[active]
            new_stacks[active] -= contribution
            new_pips[active] += contribution
            
            state = RoundState(
                button=self.button + 1,
                street=self.street,
                final_street=self.final_street,
                pips=new_pips,
                stacks=new_stacks,
                hands=self.hands,
                deck=self.deck,
                previous_state=self
            )
            return state.proceed_street()
        
        elif isinstance(action, CheckAction):
            if (self.street == 0 and self.button > 0) or self.button > 1:
                return self.proceed_street()
            return RoundState(
                button=self.button + 1,
                street=self.street,
                final_street=self.final_street,
                pips=self.pips,
                stacks=self.stacks,
                hands=self.hands,
                deck=self.deck,
                previous_state=self
            )
        
        elif isinstance(action, RaiseAction):
            new_pips = list(self.pips)
            new_stacks = list(self.stacks)
            contribution = action.amount - new_pips[active]
            new_stacks[active] -= contribution
            new_pips[active] += contribution
            return RoundState(
                button=self.button + 1,
                street=self.street,
                final_street=self.final_street,
                pips=new_pips,
                stacks=new_stacks,
                hands=self.hands,
                deck=self.deck,
                previous_state=self
            )

        else:
            raise ValueError(f"Unknown action type: {action}")


class Player:
    '''
    Manages player information and logging.
    '''
    def __init__(self, name, strategy=None):
        self.name = name
        self.strategy = strategy  # Optional strategy function or class
        self.bankroll = 0
        self.game_clock = 0
        self.bytes_queue = Queue()  # For capturing output

    def log_output(self, message):
        '''
        Adds a message to the player's log queue
        '''
        if isinstance(message, str):
            self.bytes_queue.put(message.encode())
        else:
            self.bytes_queue.put(message)

    def make_decision(self, round_state, player_message, game_log):
        '''
        Determines the player's action based on the current round state
        '''
        # If a strategy is provided, use it to make a decision
        if self.strategy:
            try:
                action = self.strategy(round_state, player_message)
                return action
            except Exception as e:
                error_msg = f"{self.name} strategy error: {str(e)}"
                game_log.append(error_msg)
                self.log_output(error_msg)
                
        # Default to checking if possible, otherwise fold
        legal_actions = round_state.legal_actions()
        return CheckAction() if CheckAction in legal_actions else FoldAction()

    def save_log(self, log_dir='.'):
        '''
        Saves the player's log to a file
        '''
        log_path = os.path.join(log_dir, f"{self.name}.txt")
        try:
            with open(log_path, 'wb') as log_file:
                bytes_written = 0
                for output in self.bytes_queue.queue:
                    try:
                        bytes_written += log_file.write(output)
                        if bytes_written >= PLAYER_LOG_SIZE_LIMIT:
                            log_file.write(b"\n--- Log truncated due to size limit ---")
                            break
                    except TypeError:
                        pass
                log_file.flush()
                os.fsync(log_file.fileno())  # Ensure it's written to disk
            return True
        except Exception as e:
            print(f"Error writing log file for {self.name}: {str(e)}")
            return False


class Game:
    '''
    Manages the poker game and handles logging.
    '''
    def __init__(self, player1_name="Player A", player2_name="Player B", num_rounds=100, log_dir='.'):
        self.player1_name = player1_name
        self.player2_name = player2_name
        self.num_rounds = num_rounds
        self.log_dir = log_dir
        self.log = [f'Poker Game - {player1_name} vs {player2_name}']
        self.player_messages = [[], []]
        
        # Ensure log directory exists
        os.makedirs(self.log_dir, exist_ok=True)

    def log_round_state(self, players, round_state):
        '''
        Logs the current state of the round
        '''
        if round_state.street == 0 and round_state.button == 0:
            self.log.append(f'{players[0].name} posts the blind of {SMALL_BLIND}')
            self.log.append(f'{players[1].name} posts the blind of {BIG_BLIND}')
            self.log.append(f'{players[0].name} dealt {PCARDS(round_state.hands[0])}')
            self.log.append(f'{players[1].name} dealt {PCARDS(round_state.hands[1])}')
            self.player_messages[0] = ['T0.', 'P0', 'H' + CCARDS(round_state.hands[0])]
            self.player_messages[1] = ['T0.', 'P1', 'H' + CCARDS(round_state.hands[1])]
        elif round_state.street > 0 and round_state.button == 1:
            # For simplicity, we're using the first n cards from the deck
            board = round_state.deck[:round_state.street]
            street_name = STREET_NAMES[round_state.street - 3] if round_state.street <= 5 else f'Street {round_state.street}'
            self.log.append(f"{street_name} {PCARDS(board)}" +
                           f"{PVALUE(players[0].name, STARTING_STACK - round_state.stacks[0])}" +
                           f"{PVALUE(players[1].name, STARTING_STACK - round_state.stacks[1])}")
            compressed_board = 'B' + CCARDS(board)
            self.player_messages[0].append(compressed_board)
            self.player_messages[1].append(compressed_board)

    def log_action(self, name, action, bet_override):
        '''
        Logs a player's action
        '''
        if isinstance(action, FoldAction):
            phrasing = ' folds'
            code = 'F'
        elif isinstance(action, CallAction):
            phrasing = ' calls'
            code = 'C'
        elif isinstance(action, CheckAction):
            phrasing = ' checks'
            code = 'K'
        else:  # isinstance(action, RaiseAction)
            phrasing = (' bets ' if bet_override else ' raises to ') + str(action.amount)
            code = f'R{action.amount}'
        
        self.log.append(name + phrasing)
        self.player_messages[0].append(code)
        self.player_messages[1].append(code)

    def log_terminal_state(self, players, round_state):
        '''
        Logs the end state of a round
        '''
        previous_state = round_state.previous_state
        if previous_state and FoldAction not in previous_state.legal_actions():
            self.log.append(f'{players[0].name} shows {PCARDS(previous_state.hands[0])}')
            self.log.append(f'{players[1].name} shows {PCARDS(previous_state.hands[1])}')
            self.player_messages[0].append('O' + CCARDS(previous_state.hands[1]))
            self.player_messages[1].append('O' + CCARDS(previous_state.hands[0]))
        
        self.log.append(f'{players[0].name} awarded {round_state.deltas[0]}')
        self.log.append(f'{players[1].name} awarded {round_state.deltas[1]}')
        self.player_messages[0].append('D' + str(round_state.deltas[0]))
        self.player_messages[1].append('D' + str(round_state.deltas[1]))

    def run_round(self, players):
        '''
        Runs a single round of poker
        '''
        # Create and shuffle a new deck
        deck = eval7.Deck()
        deck.shuffle()
        hands = [deck.deal(2), deck.deal(2)]

        # Set final street based on rules (default to 5)
        final_street = 5
        
        pips = [SMALL_BLIND, BIG_BLIND]
        stacks = [STARTING_STACK - SMALL_BLIND, STARTING_STACK - BIG_BLIND]
        round_state = RoundState(0, 0, final_street, pips, stacks, hands, deck, None)
        
        # Run the round until we reach a terminal state
        while not isinstance(round_state, TerminalState):
            self.log_round_state(players, round_state)
            
            # Determine active player
            active = round_state.button % 2
            player = players[active]
            
            # Get player's action
            start_time = time.time()
            action = player.make_decision(round_state, self.player_messages[active], self.log)
            end_time = time.time()
            player.game_clock += (end_time - start_time)
            
            # Log the action
            bet_override = (round_state.pips == [0, 0])
            self.log_action(player.name, action, bet_override)
            
            # Update game state
            round_state = round_state.proceed(action)
        
        # Log the final state
        self.log_terminal_state(players, round_state)
        
        # Update player bankrolls
        for player, delta in zip(players, round_state.deltas):
            player.bankroll += delta
            player.log_output(f"Round result: {delta} chips\n")

    def save_game_log(self):
        """
        Saves the game log to a file, ensuring it's properly written
        """
        log_path = os.path.join(self.log_dir, f"{GAME_LOG_FILENAME}.txt")
        try:
            with open(log_path, 'w') as log_file:
                log_file.write('\n'.join(self.log))
                log_file.flush()
                os.fsync(log_file.fileno())  # Ensure it's written to disk
            print(f"Game log saved to: {os.path.abspath(log_path)}")
            return True
        except Exception as e:
            print(f"Error writing game log: {str(e)}")
            return False

    def run(self):
        '''
        Runs the full poker game
        '''
        print('Starting the Poker game engine...')
        
        # Create players
        players = [
            Player(self.player1_name),
            Player(self.player2_name)
        ]
        
        # Run rounds
        for round_num in range(1, self.num_rounds + 1):
            self.log.append('')
            self.log.append(f'Round #{round_num}{STATUS(players)}')
            
            # Log round start to player logs
            for player in players:
                player.log_output(f"\nStarting Round #{round_num} with bankroll: {player.bankroll}\n")
            
            # Run the round
            self.run_round(players)
            
            # Alternate button position
            players = players[::-1]
        
        # Log final results
        self.log.append('')
        self.log.append(f'Final{STATUS(players)}')
        
        # Save logs synchronously to ensure they're written
        self.save_game_log()
        
        for player in players:
            print(f'Writing {player.name}.txt')
            player.save_log(self.log_dir)
            
        return players[0].bankroll, players[1].bankroll


class GameState:
    '''
    Encodes the state of a multi-round poker game.
    (Kept for compatibility)
    '''
    def __init__(self, player_bankroll=0, bot_bankroll=0):
        self.player_bankroll = player_bankroll
        self.bot_bankroll = bot_bankroll
        self.round_num = 0
        
    def increment_round(self):
        self.round_num += 1

    def update_bankrolls(self, player_delta, bot_delta):
        self.player_bankroll += player_delta
        self.bot_bankroll += bot_delta


class PokerSettings:
    """Settings for poker games"""
    def __init__(self):
        self.SMALL_BLIND = SMALL_BLIND
        self.BIG_BLIND = BIG_BLIND
        self.STARTING_STACK = STARTING_STACK
        self.FINAL_STREET = 5  # Default final street (can be customized)