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
        <div className="w-8 h-12 bg-gray-600 rounded border border-white flex items-center justify-center">
          <span className="text-white text-xs">?</span>
        </div>
      )
    }

    if (!card) {
      return <div className="w-12 h-16 bg-gray-600 rounded border border-gray-500"></div>
    }

    let value, suit, isRed;

    // Handle both string format ("Ah") and object format ({value: "A", suit: "hearts", suit_symbol: "♥"})
    if (typeof card === 'string') {
      // Old string format
      value = card.slice(0, -1);
      suit = card.slice(-1);
      isRed = suit === 'h' || suit === 'd';
    } else if (typeof card === 'object') {
      // New object format
      value = card.value;
      suit = card.suit_symbol || card.suit;
      isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    } else {
      // Fallback for unexpected format
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#19191E] flex items-center justify-center">
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

  // Updated betting logic with new backend fields
  const currentBet = gameState?.current_bet || 0
  const playerCurrentBet = gameState?.player_current_bet || 0
  const callAmount = gameState?.call_amount || (currentBet - playerCurrentBet)
  
  // More explicit check/call logic
  const canCheck = currentBet === 0 || playerCurrentBet >= currentBet
  const needsToCall = currentBet > 0 && playerCurrentBet < currentBet
  
  const minRaise = Math.max(currentBet * 2, currentBet + (gameState?.min_bet || 100))
  const isPlayerTurn = gameState?.current_player === 'player'
  const handComplete = gameState?.hand_complete || false

  return (
    <div className="min-h-screen bg-[#19191E] p-4">
      <div className="mx-auto max-w-6xl">
        {/* Top Left Controls */}
        <div className="absolute top-20 left-4 z-50">
          <button
            onClick={() => window.location.href = '/games'}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500 mb-2 block"
          >
            Back to Games
          </button>
          {!isPlayerTurn && !handComplete && (
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
        </div>

        {/* Poker Table */}
        <div className="relative mx-auto w-full max-w-xl top-12">
          <div className="relative rounded-full bg-green-800 border-8 border-amber-600 shadow-2xl" style={{ aspectRatio: '3/2', minHeight: '100px' }}>
            
            {/* Opponent Seat */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-center">
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-600" style={{  width: '150px'}}>
                  <p className="text-white font-semibold">
                    {gameState?.opponent_bot?.name || 'Opponent Bot'}
                  </p>
                  <p className="text-gray-300 text-sm">{formatChips(gameState?.bot_stack)} chips</p>
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
                <div className="flex justify-center space-x-8 mt-1 text-xs text-gray-300">
                  <span>Flop</span>
                  <span>Turn</span>
                  <span>River</span>
                </div>
              </div>
            </div>

            {/* Player Seat */}
            <div className="absolute left-1/2 transform -translate-x-1/2 translate-y-1/2" style={{  width: '150px', marginTop: '250px'}}>
              <div className="text-center">
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {!handComplete && isPlayerTurn && (
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
              {/* Raise Input */}
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

              {/* Action Buttons */}
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
        {handComplete && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
            <h3 className="text-white font-semibold mb-2">Hand Complete</h3>
            <p className="text-gray-300 mb-4">
              {gameState?.winner === 'player' ? 'You won!' : 
               gameState?.winner === 'bot' ? 'Opponent won!' : 'Split pot!'}
            </p>
            <button
              onClick={startNewHand}
              disabled={loading}
              className="rounded-md bg-[#ff3131] px-6 py-2 text-sm font-medium text-black hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start New Hand'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}