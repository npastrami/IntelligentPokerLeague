import { useState, useEffect } from 'react'
import Sidebar from "../components/Sidebar";
import { DocumentIcon } from '@heroicons/react/24/outline'
import PlayerSeat from '../components/PlayerSeat'
import CommunityCards from '../components/CommunityCards'

export default function GameHuman({ sessionId }) {
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState('')
  const [error, setError] = useState(null)
  const [gameLog, setGameLog] = useState([])
  const [showPlayerHUD, setShowPlayerHUD] = useState(false)
  const [showOpponentHUD, setShowOpponentHUD] = useState(false)
  
  // Showdown state
  const [showdownActive, setShowdownActive] = useState(false)
  const [showdownCountdown, setShowdownCountdown] = useState(0)
  const [showdownCards, setShowdownCards] = useState({})
  const [winner, setWinner] = useState(null)
  
  // Code editor states
  const [code, setCode] = useState('# Live poker analysis script\nimport json\n\nclass PokerAnalyzer:\n    def __init__(self):\n        self.hand_history = []\n        \n    def analyze_game_state(self, game_state):\n        print(f"Current pot: {game_state.get(\'pot\', 0)}")\n        print(f"Your stack: {game_state.get(\'player_stack\', 0)}")\n        print(f"Current street: {game_state.get(\'current_street\', \'preflop\')}")\n        \n        if game_state.get(\'player_cards\'):\n            print(f"Your cards: {game_state[\'player_cards\']}")\n            \n        return "Analysis complete"\n\n# analyzer = PokerAnalyzer()\n# result = analyzer.analyze_game_state(game_state)')
  const [terminalOutput, setTerminalOutput] = useState([])
  const [showEditor, setShowEditor] = useState(true)
  const [currentCommand, setCurrentCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Extract session ID from URL if not passed as prop
  const actualSessionId = sessionId || window.location.pathname.split('/').pop()

  useEffect(() => {
    if (actualSessionId) {
      initializeGame()
    }
  }, [actualSessionId])

  // Showdown countdown effect
  useEffect(() => {
    let interval = null
    if (showdownActive && showdownCountdown > 0) {
      interval = setInterval(() => {
        setShowdownCountdown(prev => {
          if (prev <= 1) {
            setShowdownActive(false)
            setShowdownCards({})
            setWinner(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [showdownActive, showdownCountdown])

  const initializeGame = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/poker/join-game/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: actualSessionId })
      })

      if (response.ok) {
        const data = await response.json()
        setGameState(data)
        addToGameLog('Hand started')
        if (data.current_street !== 'preflop') {
          addToGameLog(`${data.current_street} revealed`)
        }
      } else {
        setError('Failed to load game')
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const addToGameLog = (message) => {
    setGameLog(prev => [...prev, `• ${message}`].slice(-10))
  }

  const addToTerminal = (message, type = 'output') => {
    const timestamp = new Date().toLocaleTimeString()
    setTerminalOutput(prev => [...prev, { 
      id: Date.now(), 
      message, 
      type, 
      timestamp 
    }].slice(-100)) // Keep last 100 messages
  }

  const runCode = async () => {
    try {
      addToTerminal('> Running Python script...', 'command')
      
      const token = localStorage.getItem('token')
      const response = await fetch('/api/poker/run-code/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          content: code,
          language: 'python',
          game_state: gameState
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.output) {
          addToTerminal(data.output, 'output')
        }
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach(error => addToTerminal(error, 'error'))
        }
      } else {
        addToTerminal('Failed to execute code', 'error')
      }
      
    } catch (error) {
      addToTerminal(`Connection error: ${error.message}`, 'error')
    }
  }

  const executeCommand = async (command) => {
    if (!command.trim()) return

    // Add to history
    setCommandHistory(prev => [...prev, command].slice(-50))
    setHistoryIndex(-1)
    
    // Display command
    addToTerminal(`$ ${command}`, 'command')

    // Handle special commands
    if (command === 'clear') {
      setTerminalOutput([])
      return
    }

    if (command === 'help') {
      addToTerminal('Available commands:', 'output')
      addToTerminal('  clear - Clear terminal', 'output')
      addToTerminal('  run - Execute editor code', 'output')
      addToTerminal('  game - Show current game state', 'output')
      addToTerminal('  help - Show this help', 'output')
      return
    }

    if (command === 'run') {
      await runCode()
      return
    }

    if (command === 'game') {
      if (gameState) {
        addToTerminal(JSON.stringify(gameState, null, 2), 'output')
      } else {
        addToTerminal('No game state available', 'output')
      }
      return
    }

    // Send command to backend for execution
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/poker/execute-command/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          command,
          game_state: gameState
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.output) {
          addToTerminal(data.output, 'output')
        }
        if (data.error) {
          addToTerminal(data.error, 'error')
        }
      } else {
        addToTerminal(`Command not found: ${command}`, 'error')
      }
    } catch (error) {
      addToTerminal(`Error executing command: ${error.message}`, 'error')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      executeCommand(currentCommand)
      setCurrentCommand('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCurrentCommand('')
      }
    }
  }

  const clearTerminal = () => {
    setTerminalOutput([])
  }

  const handleAction = async (actionType) => {
    if (actionLoading) return

    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const actionData = {
        session_id: actualSessionId,
        action_type: actionType,
        ...(actionType === 'raise' && { amount: parseInt(raiseAmount) })
      }

      const response = await fetch('/api/poker/make-move/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(actionData)
      })

      if (response.ok) {
        const data = await response.json()
        setGameState(data)
        addToGameLog(`You ${actionType}${actionType === 'raise' ? ` to ${raiseAmount}` : ''}`)
        setRaiseAmount('')
        
        if (data.last_bot_action) {
          addToGameLog(`Opponent ${data.last_bot_action}`)
        }
        
        if (data.street_changed) {
          addToGameLog(`${data.current_street} revealed`)
        }

        // Handle showdown
        if (data.showdown) {
          setShowdownActive(true)
          setShowdownCountdown(5)
          setShowdownCards(data.showdown_cards || {})
          setWinner(data.winner)
          addToGameLog('Showdown! Cards revealed.')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Invalid move')
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setActionLoading(false)
    }
  }

  const startNewHand = async () => {
    if (showdownActive) return // Don't allow new hand during showdown
    
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/poker/start-hand/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: actualSessionId })
      })

      if (response.ok) {
        const data = await response.json()
        setGameState(data)
        setGameLog([])
        addToGameLog('New hand started')
        setError(null)
        
        // Reset showdown state
        setShowdownActive(false)
        setShowdownCards({})
        setWinner(null)
        setShowdownCountdown(0)
      }
    } catch (err) {
      setError('Failed to start new hand')
    } finally {
      setLoading(false)
    }
  }

  const formatChips = (amount) => amount?.toLocaleString() || '0'

  const renderCard = (card, isHidden = false) => {
    if (isHidden) {
      return (
        <div className="w-8 h-12 bg-neutral-600 rounded border border-white flex items-center justify-center">
          <span className="text-white text-xs">?</span>
        </div>
      )
    }

    if (!card) {
      return <div className="w-12 h-16 bg-neutral-600 rounded border border-neutral-500"></div>
    }

    let value, suit, isRed;

    if (typeof card === 'string') {
      value = card.slice(0, -1);
      suit = card.slice(-1);
      isRed = suit === 'h' || suit === 'd';
    } else if (typeof card === 'object') {
      value = card.value;
      suit = card.suit_symbol || card.suit;
      isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    } else {
      return <div className="w-12 h-16 bg-neutral-600 rounded border border-neutral-500"></div>
    }
    
    return (
      <div className="w-12 h-16 bg-white rounded border-2 border-neutral-800 flex items-center justify-center">
        <span className={`font-bold text-xs ${isRed ? 'text-red-600' : 'text-black'}`}>
          {value}{suit}
        </span>
      </div>
    )
  }

  const getWinnerMessage = () => {
    if (!winner) return ''
    
    if (winner === 'player') {
      return `You win $${formatChips(gameState?.pot || 0)}!`
    } else if (winner === 'bot') {
      return `Bot wins $${formatChips(gameState?.pot || 0)}.`
    } else {
      return `Split pot! Each player wins $${formatChips((gameState?.pot || 0) / 2)}.`
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80%] bg-neutral-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (error && !gameState) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#ff3131] text-xl mb-4">{error}</div>
          <button
            onClick={initializeGame}
            className="px-4 py-2 bg-[#ff3131] text-black rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentBet = gameState?.current_bet || 0
  const playerCurrentBet = gameState?.player_current_bet || 0
  const callAmount = gameState?.call_amount || (currentBet - playerCurrentBet)
  
  const canCheck = currentBet === 0 || playerCurrentBet >= currentBet
  const needsToCall = currentBet > 0 && playerCurrentBet < currentBet
  
  const minRaise = gameState?.min_raise || (currentBet > 0 ? currentBet * 2 : 2)
  const isPlayerTurn = gameState?.current_player === 'player'
  const handComplete = gameState?.hand_complete || false

  // Determine which cards to show for opponent
  const opponentCards = showdownActive && showdownCards?.bot_cards 
    ? showdownCards.bot_cards 
    : gameState?.bot_cards || []

  return (
    <div className="min-h-screen bg-neutral-900 flex">
      {/* Main Game Area - 70% width */}
      <div className={`${showEditor ? 'w-[70%]' : 'w-full'} p-4 transition-all duration-300`}>
        {/* Top Left Controls */}
        <div className="absolute top-20 left-4 z-50">
          <button
            onClick={() => window.location.href = '/games'}
            className="rounded-md bg-neutral-600 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-500 mb-2 block"
          >
            Back to Games
          </button>
          {!isPlayerTurn && !handComplete && !showdownActive && (
            <p className="text-white font-semibold">Waiting for opponent...</p>
          )}
        </div>

        {/* Game Info Header */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-white">Heads-Up Poker</h1>
          <p className="text-neutral-300">
            Hand #{gameState?.hands_played || 1} • {gameState?.current_street || 'preflop'} 
            {gameState?.last_action && ` • ${gameState.last_action}`}
          </p>
          {error && (
            <p className="text-[#ff3131] text-sm mt-1">{error}</p>
          )}
          
          {/* Showdown countdown */}
          {showdownActive && (
            <div className="mt-2 p-3 bg-neutral-500 rounded-lg">
              <p className="text-white font-bold text-lg">{getWinnerMessage()}</p>
              <p className="text-white text-sm">Next hand in {showdownCountdown} seconds...</p>
            </div>
          )}
        </div>

        {/* Poker Table */}
        <div className="relative mx-auto w-full max-w-xl top-12">
          <div className="relative rounded-full bg-green-800 border-8 border-amber-600 shadow-2xl" style={{ aspectRatio: '3/2', minHeight: '100px' }}>
            
            {/* Opponent Seat */}
            <PlayerSeat
              positionClasses="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              playerName={gameState?.opponent_bot?.name || "Opponent Bot"}
              stack={gameState?.bot_stack}
              cards={opponentCards}
              isHUDVisible={showOpponentHUD}
              onToggleHUD={() => setShowOpponentHUD(!showOpponentHUD)}
              hudStats={{
                vpip: 15, pfr: 12, ats: 28, f2s: 72,
                "3b": 5, f3b: 78, cb: 68, fcb: 52,
                wtsd: 22, wsd: 48,
              }}
              hands={285}
              renderCard={renderCard}
              formatChips={formatChips}
            />

            {/* Community Cards */}
            <CommunityCards
              pot={gameState?.pot}
              boardCards={gameState?.board_cards}
              renderCard={renderCard}
              formatChips={formatChips}
            />

            {/* Player Seat */}
            <PlayerSeat
              positionClasses="absolute left-1/2 transform -translate-x-1/2 translate-y-1/2"
              marginTop="250px"
              playerName="You"
              stack={gameState?.player_stack}
              cards={gameState?.player_cards}
              isHUDVisible={showPlayerHUD}
              onToggleHUD={() => setShowPlayerHUD(!showPlayerHUD)}
              hudStats={{
                vpip: 24, pfr: 18, ats: 32, f2s: 65,
                "3b": 8, f3b: 72, cb: 75, fcb: 58,
                wtsd: 28, wsd: 52,
              }}
              hands={450}
              renderCard={renderCard}
              formatChips={formatChips}
            />
          </div>
        </div>

        {/* Action Panel */}
        {!handComplete && isPlayerTurn && !showdownActive && (
          <div className="mt-40 bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="text-center mb-4">
              <p className="text-white font-semibold">Your Turn</p>
              <p className="text-neutral-300 text-sm">
                {needsToCall 
                  ? `Call ${formatChips(callAmount)} to continue` 
                  : canCheck 
                    ? 'No bet to call - you can check' 
                    : 'Action to you'}
              </p>
            </div>

            <div className="flex flex-col space-y-4 max-w-md mx-auto">
              <div className="flex items-center space-x-2">
                <label className="text-white text-sm font-medium">Raise to:</label>
                <input
                  type="number"
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(e.target.value)}
                  min={minRaise}
                  max={gameState?.player_stack}
                  className="flex-1 rounded-md border border-neutral-600 bg-neutral-700 px-3 py-2 text-white placeholder-neutral-400 focus:border-[#ff3131] focus:outline-none focus:ring-1 focus:ring-[#ff3131]"
                  placeholder={`Min: $${formatChips(minRaise)}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleAction('fold')}
                  disabled={actionLoading}
                  className="rounded-md bg-[#ff3131] px-4 py-3 text-sm font-medium text-black hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  Fold
                </button>
                
                <button
                  onClick={() => handleAction(canCheck ? 'check' : 'call')}
                  disabled={actionLoading}
                  className="rounded-md bg-[#ff3131] px-4 py-3 text-sm font-medium text-black hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {canCheck ? 'Check' : `Call ${formatChips(callAmount)}`}
                </button>
                
                <button
                  onClick={() => handleAction('raise')}
                  disabled={actionLoading || !raiseAmount || parseInt(raiseAmount) < minRaise}
                  className="rounded-md bg-[#ff3131] px-4 py-3 text-sm font-medium text-black hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? 'Acting...' : 'Raise'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hand Complete */}
        {handComplete && !showdownActive && (
          <div className="mt-8 bg-neutral-800 rounded-lg p-6 border border-neutral-700 text-center">
            <h3 className="text-white font-semibold mb-2">Hand Complete</h3>
            <p className="text-neutral-300 mb-4">
              {gameState?.winner === 'player' ? 'You won!' : 
               gameState?.winner === 'bot' ? 'Opponent won!' : 'Split pot!'}
            </p>
            <button
              onClick={startNewHand}
              disabled={loading || showdownActive}
              className="rounded-md bg-[#ff3131] px-6 py-2 text-sm font-medium text-black hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Starting...' : showdownActive ? `Next hand in ${showdownCountdown}s` : 'Start New Hand'}
            </button>
          </div>
        )}
      </div>

      <Sidebar
        code={code}
        setCode={setCode}
        runCode={runCode}
        showEditor={showEditor}
        setShowEditor={setShowEditor}
        terminalOutput={terminalOutput}
        clearTerminal={clearTerminal}
        currentCommand={currentCommand}
        setCurrentCommand={setCurrentCommand}
        handleKeyPress={handleKeyPress}
      />

      {/* Toggle Editor Button when hidden */}
      {!showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white p-2 rounded-l-lg border-l border-t border-b border-gray-600 hover:bg-gray-700"
        >
          <DocumentIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}