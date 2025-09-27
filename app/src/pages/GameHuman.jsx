import { useState, useEffect } from 'react'

export default function GameHuman({ sessionId }) {
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState('')
  const [error, setError] = useState(null)
  const [gameLog, setGameLog] = useState([])

  // Extract session ID from URL if not passed as prop
  const actualSessionId = sessionId || window.location.pathname.split('/').pop()

  useEffect(() => {
    if (actualSessionId) {
      initializeGame()
    }
  }, [actualSessionId])

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
    setGameLog(prev => [...prev, `• ${message}`].slice(-10)) // Keep last 10 messages
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
        
        // If bot responded, log their action
        if (data.last_bot_action) {
          addToGameLog(`Opponent ${data.last_bot_action}`)
        }
        
        // Log street changes
        if (data.street_changed) {
          addToGameLog(`${data.current_street} revealed`)
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
        <div className="w-8 h-12 bg-blue-600 rounded border border-white flex items-center justify-center">
          <span className="text-white text-xs">?</span>
        </div>
      )
    }

    if (!card) {
      return <div className="w-12 h-16 bg-slate-600 rounded border border-slate-500"></div>
    }

    const suit = card.slice(-1)
    const rank = card.slice(0, -1)
    const isRed = suit === 'h' || suit === 'd'
    
    return (
      <div className="w-12 h-16 bg-white rounded border-2 border-slate-800 flex items-center justify-center">
        <span className={`font-bold text-xs ${isRed ? 'text-red-600' : 'text-black'}`}>
          {rank}{suit}
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-red-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (error && !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={initializeGame}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentBet = gameState?.current_bet || 0
  const minRaise = Math.max(currentBet * 2, currentBet + (gameState?.min_bet || 100))
  const canCheck = currentBet === 0 || (gameState?.player_current_bet || 0) === currentBet
  const isPlayerTurn = gameState?.current_player === 'player'
  const handComplete = gameState?.hand_complete || false

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-red-900 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Game Info Header */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-white">Heads-Up Poker</h1>
          <p className="text-slate-300">
            Hand #{gameState?.hands_played || 1} • {gameState?.current_street || 'preflop'} 
            {gameState?.last_action && ` • ${gameState.last_action}`}
          </p>
          {error && (
            <p className="text-red-400 text-sm mt-1">{error}</p>
          )}
        </div>

        {/* Poker Table */}
        <div className="relative mx-auto w-full max-w-4xl">
          <div className="relative rounded-full bg-green-800 border-8 border-amber-600 shadow-2xl" style={{ aspectRatio: '3/2', minHeight: '400px' }}>
            
            {/* Opponent Seat */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className="text-center">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-white font-semibold">
                    {gameState?.opponent_bot?.name || 'Opponent Bot'}
                  </p>
                  <p className="text-slate-300 text-sm">{formatChips(gameState?.bot_stack)} chips</p>
                  <div className="flex space-x-1 mt-2 justify-center">
                    {renderCard(null, true)}
                    {renderCard(null, true)}
                  </div>
                </div>
              </div>
            </div>

            {/* Community Cards */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-center">
                <p className="text-white font-semibold mb-2">Pot: {formatChips(gameState?.pot)}</p>
                <div className="flex space-x-2 justify-center">
                  {/* Flop */}
                  {Array(3).fill(0).map((_, i) => (
                    <div key={`flop-${i}`}>
                      {renderCard(gameState?.board_cards?.[i])}
                    </div>
                  ))}
                  {/* Turn */}
                  <div>
                    {renderCard(gameState?.board_cards?.[3])}
                  </div>
                  {/* River */}
                  <div>
                    {renderCard(gameState?.board_cards?.[4])}
                  </div>
                </div>
                <div className="flex justify-center space-x-8 mt-1 text-xs text-slate-300">
                  <span>Flop</span>
                  <span>Turn</span>
                  <span>River</span>
                </div>
              </div>
            </div>

            {/* Player Seat */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="text-center">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-white font-semibold">You</p>
                  <p className="text-slate-300 text-sm">{formatChips(gameState?.player_stack)} chips</p>
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {!handComplete && isPlayerTurn && (
          <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-center mb-4">
              <p className="text-white font-semibold">Your Turn</p>
              <p className="text-slate-300 text-sm">
                {currentBet > 0 ? `Current bet to call: ${formatChips(currentBet)}` : 'No current bet'}
              </p>
            </div>

            <div className="flex flex-col space-y-4 max-w-md mx-auto">
              {/* Raise Input */}
              <div className="flex items-center space-x-2">
                <label className="text-white text-sm font-medium">Raise to:</label>
                <input
                  type="number"
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(e.target.value)}
                  min={minRaise}
                  max={gameState?.player_stack}
                  className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={`Min: ${formatChips(minRaise)}`}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleAction('fold')}
                  disabled={actionLoading}
                  className="rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  Fold
                </button>
                
                <button
                  onClick={() => handleAction(canCheck ? 'check' : 'call')}
                  disabled={actionLoading}
                  className="rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {canCheck ? 'Check' : `Call ${formatChips(currentBet)}`}
                </button>
                
                <button
                  onClick={() => handleAction('raise')}
                  disabled={actionLoading || !raiseAmount || parseInt(raiseAmount) < minRaise}
                  className="rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? 'Acting...' : 'Raise'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hand Complete / Waiting */}
        {handComplete && (
          <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
            <h3 className="text-white font-semibold mb-2">Hand Complete</h3>
            <p className="text-slate-300 mb-4">
              {gameState?.winner === 'player' ? 'You won!' : 
               gameState?.winner === 'bot' ? 'Opponent won!' : 'Split pot!'}
            </p>
            <button
              onClick={startNewHand}
              disabled={loading}
              className="rounded-md bg-gradient-to-r from-red-600 to-blue-600 px-6 py-2 text-sm font-medium text-white hover:from-red-500 hover:to-blue-500 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start New Hand'}
            </button>
          </div>
        )}

        {!isPlayerTurn && !handComplete && (
          <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
            <p className="text-white font-semibold">Waiting for opponent...</p>
          </div>
        )}

        {/* Game Log */}
        <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-2">Game Log</h3>
          <div className="text-sm text-slate-300 space-y-1 max-h-32 overflow-y-auto">
            {gameLog.map((log, i) => (
              <p key={i}>{log}</p>
            ))}
            {gameLog.length === 0 && (
              <p className="text-slate-400">No actions yet...</p>
            )}
          </div>
        </div>

        {/* Game Controls */}
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => window.location.href = '/games'}
            className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
          >
            Back to Games
          </button>
        </div>
      </div>
    </div>
  )
}