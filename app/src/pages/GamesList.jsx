import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, CpuChipIcon, CurrencyDollarIcon, HandRaisedIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function GamesList() {
  const navigate = useNavigate()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showStartGameModal, setShowStartGameModal] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameMode, setGameMode] = useState('human')
  const [selectedPlayerBot, setSelectedPlayerBot] = useState('')
  const [userBots, setUserBots] = useState([])
  const [loading, setLoading] = useState(false)
  const [availableGames, setAvailableGames] = useState([])
  
  const [formData, setFormData] = useState({
    botName: '',
    bankroll: '',
    hands: '',
    description: ''
  })

  // Fetch available games on mount
  useEffect(() => {
    fetchAvailableGames()
  }, [])

  const fetchAvailableGames = async () => {
    try {
      const response = await fetch('/api/poker/available-games/')
      if (response.ok) {
        const data = await response.json()
        setAvailableGames(data.games || [])
      }
    } catch (error) {
      console.error('Error fetching available games:', error)
    }
  }

  const fetchUserBots = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/poker/get-user-bots/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserBots(data.bots)
      }
    } catch (error) {
      console.error('Error fetching user bots:', error)
    }
  }

  // Fetch user's bots when modal opens
  useEffect(() => {
    if (showStartGameModal) {
      fetchUserBots()
    }
  }, [showStartGameModal])

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Creating game:', formData)
    setShowCreateForm(false)
    setFormData({ botName: '', bankroll: '', hands: '', description: '' })
  }

  const handleChallenge = (game) => {
    setSelectedGame(game)
    setShowStartGameModal(true)
    setGameMode('human')
    setSelectedPlayerBot('')
  }

  const handleStartGame = async () => {
    if (!selectedGame) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const gameData = {
        mode: gameMode,
        opponent_bot_id: selectedGame.id,
        ...(gameMode === 'bot' && { player_bot_id: selectedPlayerBot })
      }

      const response = await fetch('/api/poker/initialize-game/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gameData)
      })

      if (response.ok) {
        const data = await response.json()
        setShowStartGameModal(false)
        
        if (gameMode === 'human') {
          navigate(`/game/human/${data.session_id}`)
        } else {
          navigate(`/game/bot/${data.session_id}`)
        }
      } else {
        console.error('Failed to initialize game')
      }
    } catch (error) {
      console.error('Error starting game:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-red-900 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Available Games</h1>
          <p className="mt-2 text-slate-300">Challenge other bots or post your own for matches</p>
        </div>

        {/* Create Game Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center rounded-md bg-gradient-to-r from-red-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-red-500 hover:to-blue-500"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Post New Bot
          </button>
        </div>

        {/* Create Game Form */}
        {showCreateForm && (
          <div className="mb-8 rounded-lg bg-slate-800 p-6 shadow-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Post Your Bot</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Bot Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.botName}
                    onChange={(e) => setFormData(prev => ({ ...prev, botName: e.target.value }))}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="My Awesome Bot"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Bankroll (Credits)
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    max="50000"
                    value={formData.bankroll}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankroll: e.target.value }))}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="10000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Number of Hands
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  max="10000"
                  value={formData.hands}
                  onChange={(e) => setFormData(prev => ({ ...prev, hands: e.target.value }))}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Describe your bot's strategy..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSubmit}
                  className="rounded-md bg-gradient-to-r from-red-600 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-red-500 hover:to-blue-500"
                >
                  Post Bot
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Games Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {availableGames.map((game) => (
            <div
              key={game.id}
              className="rounded-lg bg-slate-800 p-6 shadow-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <CpuChipIcon className="h-8 w-8 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-white">{game.botName}</h3>
                    <p className="text-sm text-slate-300">{game.player}</p>
                    <p className="text-xs text-slate-400">{game.university}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    game.status === 'waiting'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {game.status === 'waiting' ? 'Available' : 'In Game'}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-300">{game.description}</p>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => handleChallenge(game)}
                  disabled={game.status === 'in_game'}
                  className="flex-1 rounded-md bg-gradient-to-r from-red-600 to-blue-600 px-3 py-2 text-sm font-medium text-white hover:from-red-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {game.status === 'waiting' ? 'Challenge' : 'In Progress'}
                </button>
                <button
                  onClick={() => window.location.href = `/profile/${game.player.toLowerCase().replace(' ', '-')}`}
                  className="rounded-md bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-500"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Start Game Modal */}
        {showStartGameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Start Game</h2>
                <button
                  onClick={() => setShowStartGameModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {selectedGame && (
                <div className="mb-6">
                  <p className="text-slate-300 text-sm">Challenge: <span className="text-white font-medium">{selectedGame.botName}</span></p>
                  <p className="text-slate-400 text-xs">by {selectedGame.player}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Play Mode
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="human"
                        checked={gameMode === 'human'}
                        onChange={(e) => setGameMode(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-slate-300">Play as Human</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="bot"
                        checked={gameMode === 'bot'}
                        onChange={(e) => setGameMode(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-slate-300">Deploy Your Bot</span>
                    </label>
                  </div>
                </div>

                {gameMode === 'bot' && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Select Your Bot
                    </label>
                    <select
                      value={selectedPlayerBot}
                      onChange={(e) => setSelectedPlayerBot(e.target.value)}
                      className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Choose a bot...</option>
                      {userBots.map((bot) => (
                        <option key={bot.id} value={bot.id}>
                          {bot.name}
                        </option>
                      ))}
                    </select>
                    {userBots.length === 0 && (
                      <p className="text-slate-400 text-xs mt-1">
                        No bots available. Create one first.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleStartGame}
                    disabled={loading || (gameMode === 'bot' && !selectedPlayerBot)}
                    className="flex-1 rounded-md bg-gradient-to-r from-red-600 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-red-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Starting...' : 'Start Game'}
                  </button>
                  <button
                    onClick={() => setShowStartGameModal(false)}
                    className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {availableGames.length === 0 && (
          <div className="text-center py-12">
            <CpuChipIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-white">No games available</h3>
            <p className="mt-1 text-sm text-slate-400">Be the first to post a bot!</p>
          </div>
        )}
      </div>
    </div>
  )
}