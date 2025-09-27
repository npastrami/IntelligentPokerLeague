import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { PlayIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline'
import DraggableHUD from '../components/DraggableHud'
import HUDToggleButton from '../components/HUDToggleButton'

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
        <div className="w-8 h-12 bg-gray-600 rounded border border-white flex items-center justify-center">
          <span className="text-white text-xs">?</span>
        </div>
      )
    }

    if (!card) {
      return <div className="w-12 h-16 bg-gray-600 rounded border border-gray-500"></div>
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
      return <div className="w-12 h-16 bg-gray-600 rounded border border-gray-500"></div>
    }
    
    return (
      <div className="w-12 h-16 bg-white rounded border-2 border-gray-800 flex items-center justify-center">
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
      <div className="min-h-[80%] bg-[#19191E] flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (error && !gameState) {
    return (
      <div className="min-h-screen bg-[#19191E] flex items-center justify-center">
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
  
  const minRaise = Math.max(currentBet * 2, currentBet + (gameState?.min_bet || 100))
  const isPlayerTurn = gameState?.current_player === 'player'
  const handComplete = gameState?.hand_complete || false

  // Determine which cards to show for opponent
  const opponentCards = showdownActive && showdownCards?.bot_cards 
    ? showdownCards.bot_cards 
    : gameState?.bot_cards || []

  return (
    <div className="min-h-screen bg-[#19191E] flex">
      {/* Main Game Area - 70% width */}
      <div className={`${showEditor ? 'w-[70%]' : 'w-full'} p-4 transition-all duration-300`}>
        {/* Top Left Controls */}
        <div className="absolute top-20 left-4 z-50">
          <button
            onClick={() => window.location.href = '/games'}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500 mb-2 block"
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
          <p className="text-gray-300">
            Hand #{gameState?.hands_played || 1} • {gameState?.current_street || 'preflop'} 
            {gameState?.last_action && ` • ${gameState.last_action}`}
          </p>
          {error && (
            <p className="text-[#ff3131] text-sm mt-1">{error}</p>
          )}
          
          {/* Showdown countdown */}
          {showdownActive && (
            <div className="mt-2 p-3 bg-yellow-600 rounded-lg">
              <p className="text-black font-bold text-lg">{getWinnerMessage()}</p>
              <p className="text-black text-sm">Next hand in {showdownCountdown} seconds...</p>
            </div>
          )}
        </div>

        {/* Poker Table */}
        <div className="relative mx-auto w-full max-w-xl top-12">
          <div className="relative rounded-full bg-green-800 border-8 border-amber-600 shadow-2xl" style={{ aspectRatio: '3/2', minHeight: '100px' }}>
            
            {/* Opponent Seat */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              {/* Opponent Draggable HUD */}
              {showOpponentHUD && (
                <DraggableHUD 
                  playerName={gameState?.opponent_bot?.name || 'Opponent Bot'}
                  hands={285}
                  playerStats={{
                    vpip: 15,
                    pfr: 12,
                    ats: 28,
                    f2s: 72,
                    '3b': 5,
                    f3b: 78,
                    cb: 68,
                    fcb: 52,
                    wtsd: 22,
                    wsd: 48
                  }}
                />
              )}
              
              <div className="text-center relative">
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-600" style={{ width: '150px' }}>
                  <p className="text-white font-semibold">
                    {gameState?.opponent_bot?.name || 'Opponent Bot'}
                  </p>
                  <p className="text-gray-300 text-sm">{formatChips(gameState?.bot_stack)} chips</p>
                  <div className="flex space-x-1 mt-2 justify-center">
                    {opponentCards.length > 0 ? (
                      <>
                        {renderCard(opponentCards[0])}
                        {renderCard(opponentCards[1])}
                      </>
                    ) : (
                      <>
                        {renderCard(null, true)}
                        {renderCard(null, true)}
                      </>
                    )}
                  </div>
                  
                  {/* Opponent HUD Toggle Button */}
                  <HUDToggleButton 
                    isVisible={showOpponentHUD}
                    onToggle={() => setShowOpponentHUD(!showOpponentHUD)}
                  />
                </div>
              </div>
            </div>

            {/* Community Cards */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-center">
                <p className="text-white font-semibold mb-2">Pot: {formatChips(gameState?.pot)}</p>
                <div className="flex space-x-2 justify-center">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={`flop-${i}`}>
                      {renderCard(gameState?.board_cards?.[i])}
                    </div>
                  ))}
                  <div>
                    {renderCard(gameState?.board_cards?.[3])}
                  </div>
                  <div>
                    {renderCard(gameState?.board_cards?.[4])}
                  </div>
                </div>
                <div className="flex justify-center space-x-8 mt-1 text-xs text-gray-300">
                  <span>Flop</span>
                  <span>Turn</span>
                  <span>River</span>
                </div>
              </div>
            </div>

            {/* Player Seat */}
            <div className="absolute left-1/2 transform -translate-x-1/2 translate-y-1/2" style={{ marginTop: '250px' }}>
              {/* Player Draggable HUD */}
              {showPlayerHUD && (
                <DraggableHUD 
                  playerName="You"
                  hands={450}
                  playerStats={{
                    vpip: 24,
                    pfr: 18,
                    ats: 32,
                    f2s: 65,
                    '3b': 8,
                    f3b: 72,
                    cb: 75,
                    fcb: 58,
                    wtsd: 28,
                    wsd: 52
                  }}
                />
              )}
              
              {/* Player card */}
              <div className="text-center relative" style={{ width: '150px' }}>
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-600">
                  <p className="text-white font-semibold">You</p>
                  <p className="text-gray-300 text-sm">{formatChips(gameState?.player_stack)} chips</p>
                  <div className="flex space-x-1 mt-2 justify-center">
                    {gameState?.player_cards?.map((card, i) => (
                      <div key={i} className="w-8 h-12">
                        {renderCard(card)}
                      </div>
                    )) || [
                      <div key="0" className="w-8 h-12">{renderCard(null, true)}</div>,
                      <div key="1" className="w-8 h-12">{renderCard(null, true)}</div>
                    ]}
                  </div>
                  
                  {/* Player HUD Toggle Button */}
                  <HUDToggleButton 
                    isVisible={showPlayerHUD}
                    onToggle={() => setShowPlayerHUD(!showPlayerHUD)}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Panel */}
        {!handComplete && isPlayerTurn && !showdownActive && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center mb-4">
              <p className="text-white font-semibold">Your Turn</p>
              <p className="text-gray-300 text-sm">
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
                  className="flex-1 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-[#ff3131] focus:outline-none focus:ring-1 focus:ring-[#ff3131]"
                  placeholder={`Min: ${formatChips(minRaise)}`}
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
          <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
            <h3 className="text-white font-semibold mb-2">Hand Complete</h3>
            <p className="text-gray-300 mb-4">
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

      {/* Code Editor Panel - 30% width */}
      {showEditor && (
        <div className="w-[30%] bg-slate-800 border-l border-gray-600 flex flex-col">
          {/* Editor Header */}
          <div className="bg-slate-900 p-3 border-b border-gray-600 flex items-center justify-between">
            <div className="flex items-center">
              <DocumentIcon className="h-5 w-5 text-white mr-2" />
              <span className="text-white font-medium">live_analysis.py</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={runCode}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 text-sm"
              >
                <PlayIcon className="h-4 w-4 mr-1" />
                Run
              </button>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="h-[60%] border-b border-gray-600">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={(value) => setCode(value)}
              theme="vs-dark"
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
              }}
            />
          </div>

          {/* Interactive Terminal */}
          <div className="h-[40%] bg-black flex flex-col">
            <div className="bg-gray-900 px-3 py-2 border-b border-gray-600 flex items-center justify-between">
              <span className="text-white font-medium text-sm">Terminal</span>
              <button
                onClick={clearTerminal}
                className="text-gray-400 hover:text-white text-xs"
              >
                Clear
              </button>
            </div>
            
            {/* Terminal Output */}
            <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
              {terminalOutput.map((output) => (
                <div key={output.id} className="mb-1">
                  <span className={`${
                    output.type === 'error' ? 'text-red-400' :
                    output.type === 'command' ? 'text-green-400' :
                    output.type === 'output' ? 'text-white' :
                    'text-gray-300'
                  }`}>
                    {output.message}
                  </span>
                </div>
              ))}
              {terminalOutput.length === 0 && (
                <div className="text-gray-500">
                  Interactive Python terminal ready. Type 'help' for commands.
                </div>
              )}
            </div>

            {/* Command Input */}
            <div className="border-t border-gray-600 p-2">
              <div className="flex items-center text-xs font-mono">
                <span className="text-green-400 mr-2">$</span>
                <input
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 bg-transparent text-white outline-none"
                  placeholder="Type a command..."
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Editor Button when hidden */}
      {!showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white p-2 rounded-l-lg border-l border-t border-b border-gray-600 hover:bg-slate-700"
        >
          <DocumentIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}