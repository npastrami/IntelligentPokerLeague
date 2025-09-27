import os
import sys
import importlib.util
import zipfile
import tempfile
import shutil
import threading
import time
import logging
import traceback
from pathlib import Path
from django.conf import settings
from django.db import connection
from queue import Queue

from .engine import (
    RoundState, FoldAction, CallAction, CheckAction, RaiseAction, TerminalState,
    SMALL_BLIND, BIG_BLIND, STARTING_STACK, PokerSettings
)
import eval7

CCARDS = lambda cards: ','.join(map(str, cards))
PCARDS = lambda cards: '[{}]'.format(' '.join(map(str, cards)))
PVALUE = lambda name, value: ', {} ({})'.format(name, value)
STATUS = lambda players: ''.join([PVALUE(p.name, p.bankroll) for p in players])
STREET_NAMES = ['Flop', 'Turn', 'River']
PLAYER_LOG_SIZE_LIMIT = 1024 * 1024  # 1MB log size limit
logger = logging.getLogger(__name__)

# Dictionary to keep track of running bot simulations
RUNNING_SIMULATIONS = {}


class SimpleBot:
    """Simple default bot that makes basic decisions"""
    
    def get_action(self, game_state, round_state, active):
        """
        Simple bot strategy: check when possible, call otherwise, fold if necessary
        """
        legal_actions = round_state.legal_actions()
        
        if CheckAction in legal_actions:
            return CheckAction()
        elif CallAction in legal_actions:
            return CallAction()
        else:
            return FoldAction()


class BotInterface:
    """
    Interface for bot interaction. Handles loading and communicating with bots.
    """
    def __init__(self, bot_repository=None, bot_instance=None):
        """
        Initialize a bot interface either from a repository or a direct instance
        
        Args:
            bot_repository: BotRepository model instance
            bot_instance: Already initialized bot instance
        """
        self.bot_repository = bot_repository
        self.bot_instance = bot_instance
        self.temp_dir = None
        
        # Import action types once at init time
        from .engine import FoldAction, CallAction, CheckAction, RaiseAction
        self.FoldAction = FoldAction
        self.CallAction = CallAction
        self.CheckAction = CheckAction
        self.RaiseAction = RaiseAction
        
        if bot_repository and not bot_instance:
            self.bot_instance = self._load_bot_from_repository(bot_repository)
        elif not bot_instance:
            self.bot_instance = SimpleBot()  # Default fallback
    
    def _load_bot_from_repository(self, bot_repository):
        """
        Load a bot based on the repository information
        
        Args:
            bot_repository: BotRepository model instance
            
        Returns:
            An initialized bot instance
        """
        # Check if this is a simple bot request
        if hasattr(bot_repository, 'name') and bot_repository.name.lower() == 'simple':
            return SimpleBot()
        
        # Get file path from metadata
        if not hasattr(bot_repository, 'metadata') or not bot_repository.metadata:
            logger.warning(f"Bot repository has no metadata: {bot_repository.name}")
            return SimpleBot()  # Fallback to SimpleBot
        
        file_path = bot_repository.metadata.get('file_path')
        if not file_path:
            logger.warning(f"Bot repository has no file_path in metadata: {bot_repository.name}")
            return SimpleBot()  # Fallback to SimpleBot
        
        # Convert relative path to absolute if needed
        if file_path.startswith('pokerbots/'):
            file_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # Check if file exists and load it
        if os.path.exists(file_path):
            try:
                return self._load_bot_from_path(file_path)
            except Exception as e:
                logger.error(f"Error loading bot: {str(e)}")
                traceback.print_exc()
                return SimpleBot()
        else:
            logger.warning(f"Bot file not found: {file_path}")
            
            # Try to find the file by filename in MEDIA_ROOT
            try:
                base_name = os.path.basename(file_path)
                logger.info(f"Looking for {base_name} in {settings.MEDIA_ROOT}")
                
                for root, dirs, files in os.walk(settings.MEDIA_ROOT):
                    for file in files:
                        if file == base_name:
                            full_path = os.path.join(root, file)
                            logger.info(f"Found file at {full_path}")
                            return self._load_bot_from_path(full_path)
            except Exception as e:
                logger.error(f"Error finding file: {str(e)}")
                
            return SimpleBot()  # Fallback to SimpleBot
    
    def _load_bot_from_path(self, bot_path):
        """
        Load a bot from a file path, handling zip files and directories
        
        Args:
            bot_path: Path to the bot file or zip
            
        Returns:
            An initialized bot instance
        """
        logger.info(f"Loading bot from path: {bot_path}")
        
        if not os.path.exists(bot_path):
            raise FileNotFoundError(f"Bot path does not exist: {bot_path}")
        
        # Handle zip files
        if bot_path.endswith('.zip'):
            # Create a temporary directory
            self.temp_dir = tempfile.mkdtemp(prefix='poker_bot_')
            
            # Extract the zip
            with zipfile.ZipFile(bot_path, 'r') as zip_ref:
                zip_ref.extractall(self.temp_dir)
            
            # Find the player.py file
            player_files = list(Path(self.temp_dir).glob('**/player.py'))
            if not player_files:
                raise FileNotFoundError(f"No player.py found in {bot_path}")
            
            module_path = str(player_files[0])
            module_dir = os.path.dirname(module_path)
            
            # Add the module directory to sys.path to resolve imports
            if module_dir not in sys.path:
                sys.path.insert(0, module_dir)
                
            # Add project skeletons directory to sys.path if exists
            project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            skeleton_dir = os.path.join(project_dir, 'skeletons')
            if os.path.exists(skeleton_dir) and skeleton_dir not in sys.path:
                sys.path.insert(0, skeleton_dir)
        else:
            # It's already a directory or direct file path
            if os.path.isdir(bot_path):
                module_path = os.path.join(bot_path, 'player.py')
                if not os.path.exists(module_path):
                    raise FileNotFoundError(f"No player.py found in {bot_path}")
            else:
                module_path = bot_path
            
            # Add the directory to sys.path
            module_dir = os.path.dirname(module_path)
            if module_dir not in sys.path:
                sys.path.insert(0, module_dir)
        
        # Load the module
        try:
            # Import action types to make them available to the bot
            from .engine import FoldAction, CallAction, CheckAction, RaiseAction
            
            module_name = f'user_bot_module_{id(self)}'  # Use unique module name to avoid conflicts
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            if spec is None:
                raise ImportError(f"Could not load module from {module_path}")
            
            module = importlib.util.module_from_spec(spec)
            
            # Inject action types into the module namespace
            module.FoldAction = FoldAction
            module.CallAction = CallAction
            module.CheckAction = CheckAction
            module.RaiseAction = RaiseAction
            
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            
            # Look for a class with get_action method
            bot_class = None
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if hasattr(attr, 'get_action') and callable(getattr(attr, 'get_action')):
                    bot_class = attr
                    break
            
            if not bot_class and hasattr(module, 'get_action') and callable(module.get_action):
                # The module itself has get_action directly as a function
                class DirectFunctionBot:
                    def get_action(self, game_state, round_state, active):
                        return module.get_action(game_state, round_state, active)
                return DirectFunctionBot()
            
            if not bot_class:
                raise ValueError(f"No bot class with get_action method found in {module_path}")
            
            # Also make action types available in the bot class
            bot_class.FoldAction = FoldAction
            bot_class.CallAction = CallAction
            bot_class.CheckAction = CheckAction
            bot_class.RaiseAction = RaiseAction
            
            # Try to instantiate the bot
            try:
                return bot_class()
            except Exception as e:
                try:
                    return bot_class(name="loaded_bot")
                except:
                    try:
                        return bot_class(0)  # Some bots expect a player index
                    except:
                        raise ValueError(f"Could not instantiate bot class: {e}")
        except Exception as e:
            logger.error(f"Error loading bot module: {str(e)}")
            raise
    
    def get_action(self, game_state, round_state, active):
        """
        Get an action from the bot
        
        Args:
            game_state: Current game state (can be None)
            round_state: Current round state
            active: Active player (0 or 1)
            
        Returns:
            Action chosen by the bot
        """
        if not self.bot_instance:
            raise ValueError("Bot not initialized")
            
        # Import action types to ensure they're available in this scope
        from .engine import FoldAction, CallAction, CheckAction, RaiseAction
        
        try:
            # Define a wrapper function for the bot's get_action method
            def wrapped_bot_get_action(*args, **kwargs):
                # Make action types available in the bot's local namespace
                globals_dict = {
                    'FoldAction': FoldAction,
                    'CallAction': CallAction,
                    'CheckAction': CheckAction,
                    'RaiseAction': RaiseAction
                }
                
                # Get the bot's original method
                original_method = self.bot_instance.get_action
                
                # Create a wrapper that injects the action types
                def wrapped_method(*args, **kwargs):
                    # Store original globals
                    original_globals = dict(globals())
                    
                    # Update globals with our action types
                    globals().update(globals_dict)
                    
                    try:
                        # Call the original method
                        return original_method(*args, **kwargs)
                    finally:
                        # Restore original globals
                        globals_copy = dict(globals())
                        globals().clear()
                        globals().update(original_globals)
                
                return wrapped_method(*args, **kwargs)
            
            # Call the wrapped function
            return wrapped_bot_get_action(game_state, round_state, active)
            
        except NameError as e:
            # If we get a NameError about undefined action types, handle it by returning a default action
            if "CallAction" in str(e) or "FoldAction" in str(e) or "CheckAction" in str(e) or "RaiseAction" in str(e):
                logger.warning(f"Bot tried to use undefined action type: {str(e)}")
                # Get legal actions and return a valid one
                if hasattr(round_state, 'legal_actions'):
                    legal_actions = round_state.legal_actions()
                    if CheckAction in legal_actions:
                        return CheckAction()
                    if CallAction in legal_actions:
                        return CallAction()
                    return FoldAction()
                return FoldAction()
            raise  # Re-raise if it's a different NameError
            
        except Exception as e:
            logger.error(f"Error getting bot action: {str(e)}")
            # Basic error handling - get a legal action
            if hasattr(round_state, 'legal_actions'):
                legal_actions = round_state.legal_actions()
                if CheckAction in legal_actions:
                    return CheckAction()
                return FoldAction()
            return FoldAction()
    
    def __del__(self):
        """Clean up temporary directory if it exists"""
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
            except:
                pass


class PokerGameManager:
    """
    Manages poker games, including both human vs bot and bot vs bot modes
    with comprehensive logging functionality
    """
    def __init__(self, session):
        """Initialize the game manager with a session"""
        self.session = session
        self.player = session.player
        self.deck = eval7.Deck()  # Initial deck
        self.settings = PokerSettings()
        
        # Game logging
        self.log = [f'Poker Game - {session.player_bot.name if hasattr(session, "player_bot") and session.player_bot else "Human"} vs {session.opponent_bot.name if hasattr(session, "opponent_bot") and session.opponent_bot else "Bot"}']
        self.player_messages = [[], []]  # Messages for each player
        self.log_dir = os.path.join(settings.MEDIA_ROOT, 'game_logs', str(session.session_id))
        
        # Ensure log directory exists
        os.makedirs(self.log_dir, exist_ok=True)
        
        # Determine game mode
        self.is_bot_vs_bot = hasattr(session, 'play_mode') and session.play_mode == 'bot'
        self.is_human_vs_bot = not self.is_bot_vs_bot
        
        logger.info(f"Session mode: {'bot_vs_bot' if self.is_bot_vs_bot else 'human_vs_bot'}")
        logger.info(f"Session player_bot: {session.player_bot.name if hasattr(session, 'player_bot') and session.player_bot else 'None'}")
        logger.info(f"Session opponent_bot: {session.opponent_bot.name if hasattr(session, 'opponent_bot') and session.opponent_bot else 'None'}")
        
        # Initialize simple bot for human vs bot games
        self.simple_bot = BotInterface()  # Uses SimpleBot as default
        
        # Initialize player bot if in bot vs bot mode
        self.player_bot = None
        if self.is_bot_vs_bot and hasattr(session, 'player_bot') and session.player_bot:
            logger.info(f"Loading player bot from repository: {session.player_bot.name}")
            self.player_bot = BotInterface(bot_repository=session.player_bot)
            logger.info(f"Player bot loaded: {self.player_bot is not None}")
        
        # Initialize opponent bot
        self.opponent_bot = self.simple_bot  # Default is SimpleBot
        if hasattr(session, 'opponent_bot') and session.opponent_bot:
            logger.info(f"Loading opponent bot from repository: {session.opponent_bot.name}")
            self.opponent_bot = BotInterface(bot_repository=session.opponent_bot)
            logger.info(f"Opponent bot loaded: {self.opponent_bot is not None}")
        
        self.buy_in_amount = 200
        self.total_pot = 0
        self.player_total_bet = 0 
        self.bot_total_bet = 0
        
        # Player loggers
        self.player_a_logs = Queue()  # For player/player_bot outputs
        self.player_b_logs = Queue()  # For opponent_bot outputs

    def log_message(self, message):
        """Add a message to the game log"""
        self.log.append(message)
        logger.info(f"Game log: {message}")

    def log_player_message(self, player_idx, message):
        """Add a message to a player's log"""
        if isinstance(message, str):
            message = message.encode()
            
        if player_idx == 0:
            self.player_a_logs.put(message)
        else:
            self.player_b_logs.put(message)

    def log_round_state(self, round_state):
        """
        Log the current state of the round
        """
        player_name = self.session.player_bot.name if self.is_bot_vs_bot and hasattr(self.session, 'player_bot') and self.session.player_bot else "Player"
        bot_name = self.session.opponent_bot.name if hasattr(self.session, 'opponent_bot') and self.session.opponent_bot else "Bot"
        
        players = [player_name, bot_name]
        
        if round_state.street == 0 and round_state.button == 0:
            # Log blinds
            self.log_message(f'{players[0]} posts the blind of {SMALL_BLIND}')
            self.log_message(f'{players[1]} posts the blind of {BIG_BLIND}')
            
            # Log dealt cards
            self.log_message(f'{players[0]} dealt {PCARDS(round_state.hands[0])}')
            self.log_message(f'{players[1]} dealt {PCARDS(round_state.hands[1])}')
            
            # Create player messages
            self.player_messages[0] = ['T0.', 'P0', 'H' + CCARDS(round_state.hands[0])]
            self.player_messages[1] = ['T0.', 'P1', 'H' + CCARDS(round_state.hands[1])]
            
            # Add messages to player logs
            self.log_player_message(0, f"Hand dealt: {PCARDS(round_state.hands[0])}\n")
            self.log_player_message(1, f"Hand dealt: {PCARDS(round_state.hands[1])}\n")
            
        elif round_state.street > 0 and round_state.button == 1:
            # For simplicity, we're using the first n cards from the deck
            board = round_state.deck[:round_state.street]
            street_name = STREET_NAMES[round_state.street - 3] if round_state.street <= 5 else f'Street {round_state.street}'
            
            # Log board cards and player stacks
            stack_info = f"{PVALUE(players[0], STARTING_STACK - round_state.stacks[0])}" + \
                         f"{PVALUE(players[1], STARTING_STACK - round_state.stacks[1])}"
            self.log_message(f"{street_name} {PCARDS(board)}{stack_info}")
            
            # Create board message for players
            compressed_board = 'B' + CCARDS(board)
            self.player_messages[0].append(compressed_board)
            self.player_messages[1].append(compressed_board)
            
            # Add board message to player logs
            self.log_player_message(0, f"{street_name}: {PCARDS(board)}\n")
            self.log_player_message(1, f"{street_name}: {PCARDS(board)}\n")

    def log_action(self, player_idx, action, bet_override=False):
        """
        Log a player's action
        """
        player_name = self.session.player_bot.name if player_idx == 0 and self.is_bot_vs_bot and hasattr(self.session, 'player_bot') and self.session.player_bot else "Player" if player_idx == 0 else self.session.opponent_bot.name if hasattr(self.session, 'opponent_bot') and self.session.opponent_bot else "Bot"
        
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
        
        # Log the action
        self.log_message(player_name + phrasing)
        
        # Add action to player messages
        self.player_messages[0].append(code)
        self.player_messages[1].append(code)
        
        # Add to player logs
        self.log_player_message(0, f"{player_name}{phrasing}\n")
        self.log_player_message(1, f"{player_name}{phrasing}\n")

    def log_terminal_state(self, round_state):
        """
        Log the end state of a round
        """
        player_name = self.session.player_bot.name if self.is_bot_vs_bot and hasattr(self.session, 'player_bot') and self.session.player_bot else "Player"
        bot_name = self.session.opponent_bot.name if hasattr(self.session, 'opponent_bot') and self.session.opponent_bot else "Bot"
        
        players = [player_name, bot_name]
        
        previous_state = round_state.previous_state
        if previous_state and FoldAction not in previous_state.legal_actions():
            # Log showdown
            self.log_message(f'{players[0]} shows {PCARDS(previous_state.hands[0])}')
            self.log_message(f'{players[1]} shows {PCARDS(previous_state.hands[1])}')
            
            # Add to player messages
            self.player_messages[0].append('O' + CCARDS(previous_state.hands[1]))
            self.player_messages[1].append('O' + CCARDS(previous_state.hands[0]))
            
            # Add to player logs
            self.log_player_message(0, f"{players[1]} shows {PCARDS(previous_state.hands[1])}\n")
            self.log_player_message(1, f"{players[0]} shows {PCARDS(previous_state.hands[0])}\n")
        
        # Log results
        self.log_message(f'{players[0]} awarded {round_state.deltas[0]}')
        self.log_message(f'{players[1]} awarded {round_state.deltas[1]}')
        
        # Add to player messages
        self.player_messages[0].append('D' + str(round_state.deltas[0]))
        self.player_messages[1].append('D' + str(round_state.deltas[1]))
        
        # Add to player logs
        self.log_player_message(0, f"Hand result: {players[0]} awarded {round_state.deltas[0]}\n")
        self.log_player_message(1, f"Hand result: {players[1]} awarded {round_state.deltas[1]}\n")

    def save_logs(self):
        """
        Save all logs to files
        """
        # Save game log
        game_log_path = os.path.join(self.log_dir, 'gamelog.txt')
        try:
            with open(game_log_path, 'w') as log_file:
                log_file.write('\n'.join(self.log))
                log_file.flush()
                os.fsync(log_file.fileno())  # Ensure it's written to disk
            logger.info(f"Game log saved to: {os.path.abspath(game_log_path)}")
        except Exception as e:
            logger.error(f"Error writing game log: {str(e)}")
        
        # Save player A log
        player_a_name = "player_a" if not (self.is_bot_vs_bot and hasattr(self.session, 'player_bot') and self.session.player_bot) else self.session.player_bot.name.replace(' ', '_').lower()
        player_a_log_path = os.path.join(self.log_dir, f"{player_a_name}.txt")
        try:
            with open(player_a_log_path, 'wb') as log_file:
                bytes_written = 0
                for output in self.player_a_logs.queue:
                    try:
                        bytes_written += log_file.write(output)
                        if bytes_written >= PLAYER_LOG_SIZE_LIMIT:
                            log_file.write(b"\n--- Log truncated due to size limit ---")
                            break
                    except TypeError:
                        pass
                log_file.flush()
                os.fsync(log_file.fileno())  # Ensure it's written to disk
            logger.info(f"Player A log saved to: {os.path.abspath(player_a_log_path)}")
        except Exception as e:
            logger.error(f"Error writing player A log: {str(e)}")
        
        # Save player B log
        player_b_name = "player_b" if not (hasattr(self.session, 'opponent_bot') and self.session.opponent_bot) else self.session.opponent_bot.name.replace(' ', '_').lower()
        player_b_log_path = os.path.join(self.log_dir, f"{player_b_name}.txt")
        try:
            with open(player_b_log_path, 'wb') as log_file:
                bytes_written = 0
                for output in self.player_b_logs.queue:
                    try:
                        bytes_written += log_file.write(output)
                        if bytes_written >= PLAYER_LOG_SIZE_LIMIT:
                            log_file.write(b"\n--- Log truncated due to size limit ---")
                            break
                    except TypeError:
                        pass
                log_file.flush()
                os.fsync(log_file.fileno())  # Ensure it's written to disk
            logger.info(f"Player B log saved to: {os.path.abspath(player_b_log_path)}")
        except Exception as e:
            logger.error(f"Error writing player B log: {str(e)}")

    # ... (rest of the methods remain unchanged)
    def start_new_hand(self, continue_session=False):
        """Initialize a new hand of poker"""
        logger.info(f"Starting new hand. Continue session: {continue_session}")
        logger.info(f"Current player stack: {self.session.player_stack}, bot stack: {self.session.bot_stack}")
        
        # Create a fresh deck for this hand
        self.deck = eval7.Deck()
        
        self.total_pot = 0
        self.player_total_bet = 0
        self.bot_total_bet = 0
        
        # Add round separator to logs
        if continue_session:
            round_num = self.session.hands_played + 1
            self.log_message("")
            self.log_message(f"Round #{round_num}{STATUS([type('Player', (), {'name': 'Player', 'bankroll': self.session.player_stack}), type('Bot', (), {'name': 'Bot', 'bankroll': self.session.bot_stack})])}")
            
            # Add round info to player logs
            self.log_player_message(0, f"\nStarting Round #{round_num} with bankroll: {self.session.player_stack}\n")
            self.log_player_message(1, f"\nStarting Round #{round_num} with bankroll: {self.session.bot_stack}\n")
        
        # Check if buy-in is needed for human vs bot mode
        if not self.is_bot_vs_bot and not continue_session and (not hasattr(self.session, 'current_coins') or self.session.current_coins == 0):
            return {
                'requires_buy_in': True,
                'buy_in_amount': self.buy_in_amount
            }
            
        self.deck.shuffle()
        player_cards = self.deck.deal(2)
        bot_cards = self.deck.deal(2)
        
        player_cards = [str(c) for c in player_cards]
        bot_cards = [str(c) for c in bot_cards]
        
        # If continuing session, use existing stacks
        if continue_session:
            starting_player_stack = self.session.player_stack
            starting_bot_stack = self.session.bot_stack
            # Alternate button position each hand
            button = 1 if self.session.game_state.get('button', 0) == 0 else 0
        else:
            starting_player_stack = self.settings.STARTING_STACK
            starting_bot_stack = self.settings.STARTING_STACK
            button = 0  # Player starts as dealer
            
        logger.info(f"Starting stacks - Player: {starting_player_stack}, Bot: {starting_bot_stack}")
        logger.info(f"Button position: {button}")
        
        # Initialize blinds based on button position
        if button == 0:  # Player is dealer/button
            pips = [self.settings.SMALL_BLIND, self.settings.BIG_BLIND]  # [player, bot]
            stacks = [
                starting_player_stack - self.settings.SMALL_BLIND,
                starting_bot_stack - self.settings.BIG_BLIND
            ]
        else:  # Bot is dealer/button
            pips = [self.settings.BIG_BLIND, self.settings.SMALL_BLIND]  # [player, bot]
            stacks = [
                starting_player_stack - self.settings.BIG_BLIND,
                starting_bot_stack - self.settings.SMALL_BLIND
            ]
        
        logger.info(f"Initial pips: {pips}")
        logger.info(f"Initial stacks after blinds: {stacks}")
        
        # Initialize round state
        round_state = RoundState(
            button=button,
            street=0,
            final_street=5,
            pips=pips,
            stacks=stacks,
            hands=[player_cards, bot_cards],
            deck=[str(c) for c in self.deck.cards],
            previous_state=None
        )
        
        # Log the initial round state
        self.log_round_state(round_state)

        # Update session
        self.session.player_cards = player_cards
        self.session.board_cards = []
        self.session.pot = sum(pips)  # Track pot correctly
        self.session.player_stack = stacks[0]
        self.session.bot_stack = stacks[1]
        self.session.current_street = 'preflop'
        self.session.game_state = self._serialize_game_state(round_state)
        self.session.save()
        
        # Determine first to act based on street and button position
        is_player_turn = button == 0 and round_state.street > 0 or button == 1 and round_state.street == 0

        # In bot vs bot mode, we show both player bots' cards
        player_cards_display = self.convert_cards_to_display(player_cards)
        
        # Custom game message for bot vs bot mode
        if self.is_bot_vs_bot:
            game_message = 'Bot vs Bot mode - click "Play Next Move" to continue'
        else:
            game_message = 'Your turn!' if is_player_turn else 'Waiting for bot...'

        return {
            'requires_buy_in': False,
            'pot': self.session.pot,
            'player_stack': self.session.player_stack,
            'bot_stack': self.session.bot_stack,
            'player_cards': player_cards_display,
            'bot_cards': self.convert_cards_to_display(bot_cards) if self.is_bot_vs_bot else [],
            'board_cards': [],
            'legal_actions': [] if self.is_bot_vs_bot else self._get_legal_actions(round_state) if is_player_turn else [],
            'game_message': game_message,
            'is_bot_vs_bot': self.is_bot_vs_bot,
            'is_player_turn': is_player_turn
        }

    def process_player_action(self, action_type, amount=0):
        """Process a player's action and get the bot's response"""
        logger.info(f"Processing player action: {action_type}, amount: {amount}")
        
        # Import action types to ensure they're available
        from .engine import FoldAction, CallAction, CheckAction, RaiseAction
        
        round_state = self._deserialize_game_state(self.session.game_state)
        logger.info(f"Round state: {round_state}")
        logger.info(f"Initial state - Pot: {self.session.pot}, Player Stack: {self.session.player_stack}, Bot Stack: {self.session.bot_stack}")
        
        if round_state is None:  # Terminal state
            logger.info("Terminal state detected at start")
            return self._create_terminal_response()
        
        # Store current state for tracking changes
        initial_state = {
            'player_stack': self.session.player_stack,
            'bot_stack': self.session.bot_stack,
            'pot': self.session.pot,
            'pips': round_state.pips.copy() if hasattr(round_state, 'pips') else [0, 0],
            'street': round_state.street if hasattr(round_state, 'street') else 0
        }
        
        # In bot vs bot mode, get player bot's action instead of using the provided action
        if self.is_bot_vs_bot and self.player_bot:
            logger.info("Getting action from player bot")
            bot_action = self.player_bot.get_action(None, round_state, 0)
            action_name = self._action_to_string(bot_action)
            logger.info(f"Player bot action: {action_name}")
            
            # Update action_type and amount based on bot's action
            action_type = self._convert_action_to_string(type(bot_action))
            if isinstance(bot_action, RaiseAction):
                amount = bot_action.amount
            
            # Create action from bot's decision
            action = bot_action
        else:
            # Human player's action
            action = self._create_action(action_type, amount, round_state)
        
        # Log the player action
        bet_override = (round_state.pips == [0, 0])
        self.log_action(0, action, bet_override)
        
        # Apply the action to advance the game state
        next_state = round_state.proceed(action)
        
        # Handle player fold
        if isinstance(action, FoldAction):
            # When player folds, only add matched bets to the pot
            matched_amount = min(initial_state['pips'])
            self.total_pot += matched_amount * 2
            current_pot = self.total_pot
            # Return excess chips to bot (the difference between their pip and the matched amount)
            bot_return = initial_state['pips'][1] - matched_amount if initial_state['pips'][1] > matched_amount else 0
            player_return = 0  # Player folded, they don't get anything back
        elif isinstance(action, CallAction):
            # Only add to pot if we're not just completing blinds
            if initial_state['pips'] != [1, 2] and initial_state['pips'] != [2, 1]:
                # Calculate how much more player needs to put in
                player_current = initial_state['pips'][0]  # What player has in already
                to_match = initial_state['pips'][1]        # What they need to match
                call_amount = to_match - player_current    # How much more they need to add
                
                if call_amount > 0:
                    self.total_pot += call_amount  # Just add the new chips
                    current_pot = self.total_pot
        else:
            # Track pips for current street
            current_street_pips = sum(initial_state['pips'])
            current_round_pips = sum(next_state.pips) if not isinstance(next_state, TerminalState) else 0
            
            # Handle pot calculation after player action
            if isinstance(next_state, TerminalState):
                self.total_pot += current_street_pips
                current_pot = self.total_pot
            else:
                if hasattr(next_state, 'street') and next_state.street > initial_state['street']:
                    self.total_pot += current_street_pips
                    current_pot = self.total_pot
                else:
                    current_pot = self.total_pot + current_round_pips
            
            bot_return = 0
            player_return = 0
                
        # Handle bot response - use opponent_bot if in bot vs bot mode, otherwise use simple_bot
        bot_action_msg = ""
        if not isinstance(next_state, TerminalState):
            dummy_game_state = None
            
            # Choose which bot to use for the opponent
            bot_to_use = self.opponent_bot if self.is_bot_vs_bot else self.simple_bot
            logger.info(f"Getting action from opponent bot")
            bot_action = bot_to_use.get_action(dummy_game_state, next_state, 1)
            logger.info(f"Opponent bot action: {self._action_to_string(bot_action)}")
            
            # Log the bot action
            self.log_action(1, bot_action, False)
            
            previous_state = next_state
            next_state = next_state.proceed(bot_action)
            logger.info(f"After bot action - Next state: {next_state}")
            
            # Create appropriate message based on game mode
            if self.is_bot_vs_bot:
                bot_name = getattr(self.session.opponent_bot, 'name', 'Opponent bot')
                bot_action_msg = f"{bot_name} {self._action_to_string(bot_action)}"
            else:
                bot_action_msg = f"Bot {self._action_to_string(bot_action)}"
            
            # Handle bot fold
            if isinstance(bot_action, FoldAction):
                # When bot folds, winner gets only the matched bet plus existing pot
                current_pips = previous_state.pips
                player_return = current_pips[0]  # Return the full bet to player since bot folded
                bot_return = 0  # Bot folded, they don't get anything back
                # Do not modify total_pot since the bot folded and chips go back to player
                logger.info(f"Bot fold - Player return: {player_return}")
            elif isinstance(bot_action, CallAction):
                # Get the amount bot has to call from the previous state
                previous_pips = previous_state.pips
                call_amount = previous_pips[0] - previous_pips[1]  # Amount bot needs to match
                if call_amount > 0:
                    self.total_pot += call_amount  # Add bot's call to pot
                current_pot = self.total_pot
                logger.info(f"Bot called {call_amount}, adding to pot, total: {current_pot}")
            elif isinstance(next_state, TerminalState):
                final_street_pips = sum(previous_state.pips)
                self.total_pot += final_street_pips
                current_pot = self.total_pot
            else:
                if hasattr(next_state, 'street') and next_state.street > previous_state.street:
                    street_end_pips = sum(previous_state.pips)
                    self.total_pot += street_end_pips
                    logger.info(f"Street advanced after bot action, added {street_end_pips} to pot")
                
                current_pot = self.total_pot + sum(next_state.pips)
        else:
            bot_action_msg = "Hand complete!"
            logger.info("Hand complete after player action")
        
        # Update stacks and pot based on final state
        if isinstance(next_state, TerminalState):
            if hasattr(next_state, 'deltas'):
                logger.info(f"Terminal state - Final pot: {self.total_pot}, Deltas: {next_state.deltas}")
                
                # Handle player fold
                if isinstance(action, FoldAction):
                    # If player folds, bot gets the pot
                    win_amount = self.session.pot
                    final_player_stack = initial_state['player_stack']  # Player gets nothing back
                    final_bot_stack = initial_state['bot_stack'] + win_amount  # Bot gets the pot
                    winner = "Bot"
                    logger.info(f"Player folded, bot wins {win_amount}")
                # Handle bot fold - bot_action will be defined in this case since we went through the bot response block
                elif 'bot_action' in locals() and isinstance(bot_action, FoldAction):
                    # If bot folds, player gets the pot and their unmatched raise back
                    win_amount = self.session.pot
                    final_player_stack = initial_state['player_stack'] + win_amount
                    final_bot_stack = initial_state['bot_stack']  # Bot gets nothing back
                    winner = "Player"
                    logger.info(f"Bot folded, player wins {win_amount}")
                # Handle normal win/loss (no fold)
                else:
                    if next_state.deltas[0] > 0:  # Player wins
                        win_amount = self.total_pot
                        final_player_stack = initial_state['player_stack'] + win_amount
                        final_bot_stack = initial_state['bot_stack']  # Bot gets nothing on loss
                        winner = "Player"
                        logger.info(f"Player wins {win_amount} at showdown")
                    elif next_state.deltas[0] < 0:  # Bot wins
                        win_amount = self.total_pot
                        final_player_stack = initial_state['player_stack']  # Player gets nothing on loss
                        final_bot_stack = initial_state['bot_stack'] + win_amount
                        winner = "Bot"
                        logger.info(f"Bot wins {win_amount} at showdown")
                    else:  # Split pot
                        win_amount = self.total_pot // 2
                        final_player_stack = initial_state['player_stack'] + win_amount
                        final_bot_stack = initial_state['bot_stack'] + win_amount
                        winner = "Split"
                        logger.info(f"Split pot, each player gets {win_amount}")
                
                logger.info(f"Final stacks - Player: {final_player_stack}, Bot: {final_bot_stack}")
                
                self.session.player_stack = final_player_stack
                self.session.bot_stack = final_bot_stack
                self.session.pot = self.total_pot  # Keep final pot for display
                
                # Log terminal state
                self.log_terminal_state(next_state)
                
                # Update hands played count for bot vs bot mode
                if self.is_bot_vs_bot:
                    self.session.hands_played = self.session.hands_played + 1
                    logger.info(f"Bot vs Bot game: Hand {self.session.hands_played} of {self.session.hands_to_play} completed")
                    # Check if game is complete
                    if self.session.hands_played >= self.session.hands_to_play:
                        logger.info(f"Bot vs Bot game completed: final score - Player: {final_player_stack}, Bot: {final_bot_stack}")
                        # Save logs at end of game
                        self.save_logs()
        else:
            # Update stacks and pot for ongoing hand
            logger.info(f"Updating session stacks - Player: {next_state.stacks[0]}, Bot: {next_state.stacks[1]}")
            self.session.player_stack = next_state.stacks[0]
            self.session.bot_stack = next_state.stacks[1]
            self.session.pot = current_pot
            
            # Log round state if street has changed
            if hasattr(next_state, 'street') and initial_state['street'] != next_state.street:
                self.log_round_state(next_state)
        
        self._update_session_from_round_state(next_state)
        
        # Prepare response data
        response_data = {
            'pot': self.session.pot,
            'player_stack': self.session.player_stack,
            'bot_stack': self.session.bot_stack,
            'player_cards': self.convert_cards_to_display(self.session.player_cards),
            'board_cards': self.convert_cards_to_display(self.session.board_cards),
            'legal_actions': [] if self.is_bot_vs_bot else self._get_legal_actions(next_state) if not isinstance(next_state, TerminalState) else [],
            'hand_complete': isinstance(next_state, TerminalState),
            'game_message': self._get_game_message(next_state, bot_action_msg),
            'is_bot_vs_bot': self.is_bot_vs_bot,
            'hands_played': self.session.hands_played if self.is_bot_vs_bot else 0,
            'hands_to_play': self.session.hands_to_play if self.is_bot_vs_bot else 0,
            'game_complete': self.session.hands_played >= self.session.hands_to_play if self.is_bot_vs_bot else False
        }
        
        # Reset pot tracking only after response is prepared
        if isinstance(next_state, TerminalState):
            logger.info(f"Resetting pot for next hand from {self.session.pot} to 0")
            self.session.pot = 0
            self.total_pot = 0
            self.session.save()
        
        return response_data
    
    def process_exit_game(self):
        """Process player exit and return remaining coins"""
        try:
            # Get remaining stack
            remaining_stack = self.session.player_stack
            if remaining_stack > 0:
                # Add coins back to player's account
                self.player.add_coins(remaining_stack)
                
                # Update session
                self.session.current_coins = 0
                self.session.player_stack = 0
                self.session.save()
                
                # Save logs before exiting
                self.save_logs()
                
                return remaining_stack
            return 0
        except Exception as e:
            logger.error(f"Error in process_exit_game: {str(e)}")
            raise e

    # Keep all other methods unchanged
    def _convert_action_to_string(self, action_type):
        """Convert action class to string representation"""
        action_map = {
            FoldAction: 'fold',
            CallAction: 'call',
            CheckAction: 'check',
            RaiseAction: 'raise'
        }
        return action_map.get(action_type, 'unknown')

    def _get_legal_actions(self, round_state):
        """Convert legal actions to string list"""
        legal_actions = round_state.legal_actions()
        return [self._convert_action_to_string(action) for action in legal_actions]
    
    def validate_buy_in(self):
        """Validate if player has enough coins for buy-in"""
        return self.player.coins >= self.buy_in_amount

    def process_buy_in(self):
        """Process the buy-in transaction"""
        if not self.validate_buy_in():
            return False, "Insufficient coins for buy-in"
        
        try:
            self.player.remove_coins(self.buy_in_amount)
            self.player.save()
            self.session.current_coins = self.buy_in_amount
            self.session.save()
            return True, "Buy-in successful"
        except ValueError as e:
            return False, str(e)

    def _create_action(self, action_type, amount, round_state):
        """Convert action_type string to action object"""
        if action_type == 'fold':
            return FoldAction()
        elif action_type == 'call':
            return CallAction()
        elif action_type == 'check':
            return CheckAction()
        elif action_type == 'raise':
            min_raise, max_raise = round_state.raise_bounds()
            amount = max(min_raise, min(max_raise, amount))
            return RaiseAction(amount)
        return CheckAction()  # Default

    def _action_to_string(self, action):
        """Convert action object to readable string"""
        if isinstance(action, FoldAction):
            return "folds"
        elif isinstance(action, CallAction):
            return "calls"
        elif isinstance(action, CheckAction):
            return "checks"
        elif isinstance(action, RaiseAction):
            return f"raises to {action.amount}"
        return "unknown action"

    def _get_game_message(self, round_state, bot_action_msg=""):
        """Generate appropriate game message based on state"""
        if isinstance(round_state, TerminalState):
            if self.is_bot_vs_bot:
                # Messages for bot vs bot mode
                player_bot_name = getattr(self.session.player_bot, 'name', 'Player bot')
                opponent_bot_name = getattr(self.session.opponent_bot, 'name', 'Opponent bot')
                
                if round_state.deltas[0] > 0:
                    return f"{player_bot_name} wins ${self.total_pot}! Click 'Next Hand' to continue."
                elif round_state.deltas[0] < 0:
                    return f"{opponent_bot_name} wins ${self.total_pot}. Click 'Next Hand' to continue."
                else:
                    split_amount = self.total_pot // 2
                    return f"Split pot! Each bot wins ${split_amount}. Click 'Next Hand' to continue."
            else:
                # Messages for human vs bot mode
                if round_state.deltas[0] > 0:
                    return f"You win ${self.total_pot}! Click 'Next Hand' to continue."
                elif round_state.deltas[0] < 0:
                    return f"Bot wins ${self.total_pot}. Click 'Next Hand' to continue."
                else:
                    split_amount = self.total_pot // 2
                    return f"Split pot! Each player wins ${split_amount}. Click 'Next Hand' to continue."
        elif bot_action_msg:
            if self.is_bot_vs_bot:
                player_bot_name = getattr(self.session.player_bot, 'name', 'Player bot')
                return f"{bot_action_msg}. {player_bot_name}'s turn!"
            return f"{bot_action_msg}. Your turn!"
        
        if self.is_bot_vs_bot:
            player_bot_name = getattr(self.session.player_bot, 'name', 'Player bot')
            return f"{player_bot_name}'s turn! Click 'Play Next Move' to continue."
        return "Your turn! Choose your action."
    
    def _update_session_from_round_state(self, round_state):
        """Update session with current round state"""
        if isinstance(round_state, TerminalState):
            if round_state.previous_state and round_state.previous_state.street > 0:
                street = round_state.previous_state.street
                visible_cards = round_state.previous_state.deck[:street]
                self.session.board_cards = visible_cards
                # Don't modify pot in terminal state
        else:
            if round_state.street > 0:
                visible_cards = round_state.deck[:round_state.street]
                self.session.board_cards = visible_cards
            
            # Update street name
            street_names = {0: 'preflop', 3: 'flop', 4: 'turn', 5: 'river'}
            self.session.current_street = street_names.get(round_state.street, self.session.current_street)
        
        self.session.game_state = self._serialize_game_state(round_state)
        self.session.save()
            
    def _is_hand_complete(self, round_state):
        """Check if the hand is complete"""
        return isinstance(round_state, TerminalState)

    def convert_cards_to_display(self, cards):
        """Convert cards to display format"""
        suits = {
            'h': {'name': 'hearts', 'symbol': '♥'},
            'd': {'name': 'diamonds', 'symbol': '♦'},
            'c': {'name': 'clubs', 'symbol': '♣'},
            's': {'name': 'spades', 'symbol': '♠'}
        }
        
        display_cards = []
        for card in cards:
            if isinstance(card, str):
                value = card[0].upper()
                suit = card[1].lower()
            else:
                value = str(card)[0].upper()
                suit = str(card)[1].lower()
                
            display_cards.append({
                'value': value,
                'suit': suits[suit]['name'],
                'suit_symbol': suits[suit]['symbol']
            })
        return display_cards

    def _serialize_game_state(self, round_state):
        """Serialize the game state for storage"""
        if isinstance(round_state, TerminalState):
            return {
                'terminal': True,
                'deltas': round_state.deltas if hasattr(round_state, 'deltas') else None,
                'button': round_state.previous_state.button if round_state.previous_state else 0,
                'total_pot': self.total_pot  # Save total_pot in the game state
            }
        return {
            'terminal': False,
            'button': round_state.button,
            'street': round_state.street,
            'final_street': round_state.final_street,
            'pips': round_state.pips,
            'stacks': round_state.stacks,
            'hands': [[str(c) for c in h] for h in round_state.hands],
            'deck': [str(c) for c in round_state.deck],
            'total_pot': self.total_pot  # Save total_pot in the game state
        }

    def _deserialize_game_state(self, state_dict):
        """Deserialize the stored game state"""
        if not state_dict or state_dict.get('terminal', False):
            return None

        # Restore total_pot from game state
        self.total_pot = state_dict.get('total_pot', 0)

        try:
            return RoundState(
                button=state_dict['button'],
                street=state_dict['street'],
                final_street=state_dict['final_street'],
                pips=state_dict['pips'],
                stacks=state_dict['stacks'],
                hands=state_dict['hands'],
                deck=state_dict['deck'],
                previous_state=None
            )
        except Exception as e:
            logger.error(f"Error deserializing game state: {str(e)}")
            # Create a fresh deck and start over if there's an error
            self.deck = eval7.Deck()
            self.deck.shuffle()
            return None

    def _create_terminal_response(self):
        """Create a response for a terminal state"""
        return {
            'pot': self.session.pot,
            'player_stack': self.session.player_stack,
            'bot_stack': self.session.bot_stack,
            'player_cards': self.convert_cards_to_display(self.session.player_cards),
            'board_cards': self.convert_cards_to_display(self.session.board_cards),
            'legal_actions': [],
            'hand_complete': True,
            'game_message': "Hand complete! Click 'Next Hand' to continue.",
            'is_bot_vs_bot': self.is_bot_vs_bot,
            'hands_played': self.session.hands_played if self.is_bot_vs_bot else 0,
            'hands_to_play': self.session.hands_to_play if self.is_bot_vs_bot else 0,
            'game_complete': self.session.hands_played >= self.session.hands_to_play if self.is_bot_vs_bot else False
        }


class BotGameSimulator(threading.Thread):
    """
    Thread class for running bot vs bot simulations in the background
    """
    
    def __init__(self, session_id):
        """Initialize the simulator with a session ID"""
        super().__init__(daemon=True)  # Use daemon thread so it doesn't block process exit
        self.session_id = session_id
        self.stop_event = threading.Event()
        self.hands_played = 0
        self.error = None
        
        # Import action types once at init time
        from .engine import FoldAction, CallAction, CheckAction, RaiseAction
        self.FoldAction = FoldAction
        self.CallAction = CallAction
        self.CheckAction = CheckAction
        self.RaiseAction = RaiseAction
    
    def stop(self):
        """Signal the thread to stop"""
        self.stop_event.set()
    
    def run(self):
        """Main thread execution - runs the bot vs bot game"""
        from .models import GameSession
        # Import action types to ensure they are available
        from .engine import FoldAction, CallAction, CheckAction, RaiseAction
        
        # Make action types available globally to all modules
        import sys
        import builtins
        builtins.FoldAction = FoldAction
        builtins.CallAction = CallAction
        builtins.CheckAction = CheckAction
        builtins.RaiseAction = RaiseAction
        
        logger.info(f"Starting bot game simulation for session {self.session_id}")
        
        try:
            # Close the connection to avoid issues with connection sharing
            connection.close()
            
            # Get the session
            session = GameSession.objects.get(session_id=self.session_id)
            session.simulation_running = True
            session.save()
            
            # Initialize game manager
            game_manager = PokerGameManager(session)
            
            # Get total hands to play
            hands_to_play = session.hands_to_play
            hands_played = session.hands_played
            
            logger.info(f"Bot game: starting with {hands_played}/{hands_to_play} hands played")
            
            # Start a new hand if needed
            if hands_played == 0 or session.pot == 0:
                game_state = game_manager.start_new_hand(continue_session=False)
                if game_state.get('requires_buy_in', False):
                    logger.error(f"Bot game requires buy-in, which should not happen in bot vs bot mode")
                    self.error = "Game requires buy-in"
                    return
            
            # Main game loop
            while hands_played < hands_to_play and not self.stop_event.is_set():
                try:
                    # Process one step
                    response = game_manager.process_player_action('', 0)  # Empty action, bot will decide
                    
                    # Check if hand is complete
                    if response.get('hand_complete', False):
                        # Update hands played
                        hands_played = session.hands_played
                        self.hands_played = hands_played
                        
                        logger.info(f"Bot game: completed hand {hands_played}/{hands_to_play}")
                        
                        # Check if we've played all hands
                        if hands_played >= hands_to_play:
                            logger.info(f"Bot game completed successfully")
                            break
                        
                        # Start a new hand
                        game_manager.start_new_hand(continue_session=True)
                except Exception as step_error:
                    logger.error(f"Error in game step: {str(step_error)}")
                    logger.error(traceback.format_exc())
                    # Continue to next hand if possible
                    try:
                        game_manager.start_new_hand(continue_session=True)
                        # Update hands played to skip the failed hand
                        session.hands_played += 1
                        session.save()
                        hands_played = session.hands_played
                        self.hands_played = hands_played
                    except:
                        # If we can't continue, break the loop
                        self.error = str(step_error)
                        break
                
                # Small sleep to avoid thrashing the database
                time.sleep(0.05)
                
                # Check if we should stop
                if self.stop_event.is_set():
                    logger.info(f"Bot game simulation stopped by request")
                    break
            
            logger.info(f"Bot game simulation completed or stopped: {hands_played}/{hands_to_play} hands played")
            
            # Update session when done
            session = GameSession.objects.get(session_id=self.session_id)
            session.simulation_running = False
            session.save()
            
        except Exception as e:
            logger.error(f"Error in bot game simulation: {str(e)}")
            logger.error(traceback.format_exc())
            self.error = str(e)
            
            try:
                # Update session on error
                session = GameSession.objects.get(session_id=self.session_id)
                session.simulation_running = False
                session.save()
            except:
                pass
                
        finally:
            # Remove this simulation from the running dict
            if self.session_id in RUNNING_SIMULATIONS:
                del RUNNING_SIMULATIONS[self.session_id]


def start_bot_game(session_id):
    """
    Start a bot vs bot game simulation in a background thread
    
    Args:
        session_id: The session ID to run the simulation for
        
    Returns:
        bool: True if started successfully, False otherwise
    """
    # Import action types to ensure they're available globally
    from .engine import FoldAction, CallAction, CheckAction, RaiseAction
    
    try:
        # Check if there's already a running simulation
        if session_id in RUNNING_SIMULATIONS:
            # If it's still running, don't start a new one
            if RUNNING_SIMULATIONS[session_id].is_alive():
                logger.warning(f"Simulation already running for session {session_id}")
                return True
            # If it's not running, remove it
            del RUNNING_SIMULATIONS[session_id]
        
        # Start a new simulation
        simulator = BotGameSimulator(session_id)
        simulator.start()
        
        # Store it in the running simulations
        RUNNING_SIMULATIONS[session_id] = simulator
        
        logger.info(f"Started bot game simulation for session {session_id}")
        return True
    except Exception as e:
        logger.error(f"Error starting bot game simulation: {str(e)}")
        return False


def stop_bot_game(session_id):
    """
    Stop a running bot game simulation
    
    Args:
        session_id: The session ID to stop
        
    Returns:
        bool: True if stopped successfully, False otherwise
    """
    try:
        # Check if there's a running simulation
        if session_id in RUNNING_SIMULATIONS:
            # Signal it to stop
            RUNNING_SIMULATIONS[session_id].stop()
            logger.info(f"Signaled bot game simulation to stop for session {session_id}")
            return True
        
        logger.warning(f"No running simulation found for session {session_id}")
        return False
    except Exception as e:
        logger.error(f"Error stopping bot game simulation: {str(e)}")
        return False


def get_bot_game_status(session_id):
    """
    Get the status of a bot game simulation
    
    Args:
        session_id: The session ID to check
        
    Returns:
        tuple: (is_running, hands_played, error)
    """
    # Import action types to ensure they're available globally
    from .engine import FoldAction, CallAction, CheckAction, RaiseAction
    
    try:
        # Check if there's a running simulation
        if session_id in RUNNING_SIMULATIONS:
            simulator = RUNNING_SIMULATIONS[session_id]
            
            # Check if it's actually still running
            if simulator.is_alive():
                return True, simulator.hands_played, simulator.error
            else:
                # It's finished or stopped
                hands_played = simulator.hands_played
                error = simulator.error
                
                # Remove it from the running simulations
                del RUNNING_SIMULATIONS[session_id]
                
                return False, hands_played, error
        
        # No simulation found, check session's simulation flag
        from .models import GameSession
        try:
            session = GameSession.objects.get(session_id=session_id)
            return session.simulation_running, session.hands_played, None
        except GameSession.DoesNotExist:
            pass
            
        # No simulation found
        return False, 0, None
    except Exception as e:
        logger.error(f"Error getting bot game status: {str(e)}")
        return False, 0, str(e)