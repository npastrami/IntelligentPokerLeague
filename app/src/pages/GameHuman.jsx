import { useState } from 'react'
import { useParams } from 'react-router-dom'

export default function GameHuman() {
  const { id } = useParams()
  const [raiseAmount, setRaiseAmount] = useState('')
  const [pot, setPot] = useState(200)
  const [playerChips, setPlayerChips] = useState(9800)
  const [opponentChips, setOpponentChips] = useState(9900)
  const [currentBet, setCurrentBet] = useState(100)
  
  // Mock game state
  const [gameState, setGameState] = useState({
    playerCards: ['Ah', 'Kh'],
    communityCards: ['Qh', 'Jh', '10s'],
    currentPlayer: 'you',
    phase: 'flop',
    lastAction: 'opponent bet 100'
  })

  const handleAction = (action) => {
    console.log(`Player action: ${action}`, { raiseAmount })
    // TODO: Send action to game engine
  }

  const formatChips = (amount) => amount.toLocaleString()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-red-900 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Game Info Header */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-white">Heads-Up Poker</h1>
          <p className="text-slate-300">Game #{id} • {gameState.phase} • {gameState.lastAction}</p>
        </div>

        {/* Poker Table */}
        <div className="relative mx-auto w-full max-w-4xl">
          {/* Table Background */}
          <div className="relative rounded-full bg-green-800 border-8 border-amber-600 shadow-2xl" style={{ aspectRatio: '3/2', minHeight: '400px' }}>
            
            {/* Opponent Seat */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className="text-center">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-white font-semibold">Opponent Bot</p>
                  <p className="text-slate-300 text-sm">{formatChips(opponentChips)} chips</p>
                  {/* Hidden cards */}
                  <div className="flex space-x-1 mt-2 justify-center">
                    <div className="w-8 h-12 bg-blue-600 rounded border border-white"></div>
                    <div className="w-8 h-12 bg-blue-600 rounded border border-white"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Community Cards */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-center">
                <p className="text-white font-semibold mb-2">Pot: {formatChips(pot)}</p>
                <div className="flex space-x-2 justify-center">
                  {gameState.communityCards.map((card, i) => (
                    <div key={i} className="w-12 h-16 bg-white rounded border-2 border-slate-800 flex items-center justify-center">
                      <span className="font-bold text-slate-800 text-xs">{card}</span>
                    </div>
                  ))}
                  {/* Empty slots for remaining cards */}
                  {Array(5 - gameState.communityCards.length).fill(0).map((_, i) => (
                    <div key={`empty-${i}`} className="w-12 h-16 bg-slate-600 rounded border border-slate-500"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Player Seat */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="text-center">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-white font-semibold">You</p>
                  <p className="text-slate-300 text-sm">{formatChips(playerChips)} chips</p>
                  {/* Player cards */}
                  <div className="flex space-x-1 mt-2 justify-center">
                    {gameState.playerCards.map((card, i) => (
                      <div key={i} className="w-8 h-12 bg-white rounded border border-slate-800 flex items-center justify-center">
                        <span className="font-bold text-slate-800 text-xs">{card}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="text-center mb-4">
            <p className="text-white font-semibold">Your Turn</p>
            <p className="text-slate-300 text-sm">Current bet to call: {formatChips(currentBet)}</p>
          </div>

          <div className="flex flex-col space-y-4 max-w-md mx-auto">
            {/* Raise Input */}
            <div className="flex items-center space-x-2">
              <label className="text-white text-sm font-medium">Raise to:</label>
              <input
                type="number"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(e.target.value)}
                min={currentBet * 2}
                max={playerChips}
                className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={`Min: ${currentBet * 2}`}
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleAction('fold')}
                className="rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-500 transition-colors"
              >
                Fold
              </button>
              
              <button
                onClick={() => handleAction(currentBet === 0 ? 'check' : 'call')}
                className="rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
              >
                {currentBet === 0 ? 'Check' : `Call ${formatChips(currentBet)}`}
              </button>
              
              <button
                onClick={() => handleAction('raise')}
                disabled={!raiseAmount || raiseAmount < currentBet * 2}
                className="rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Raise
              </button>
            </div>
          </div>
        </div>

        {/* Game Log */}
        <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-2">Game Log</h3>
          <div className="text-sm text-slate-300 space-y-1 max-h-32 overflow-y-auto">
            <p>• Hand #47 started</p>
            <p>• You posted small blind (50)</p>
            <p>• Opponent posted big blind (100)</p>
            <p>• Cards dealt</p>
            <p>• Flop revealed: Qh Jh 10s</p>
            <p>• Opponent bet 100</p>
            <p>• Waiting for your action...</p>
          </div>
        </div>
      </div>
    </div>
  )
}