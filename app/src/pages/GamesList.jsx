import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, CpuChipIcon, CurrencyDollarIcon, HandRaisedIcon } from '@heroicons/react/24/outline'

export default function GamesList() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    botName: '',
    bankroll: '',
    hands: '',
    description: ''
  })

  // Mock data for existing games
  const availableGames = [
    {
      id: 1,
      botName: "PokerPro3000",
      player: "John Smith",
      university: "MIT",
      bankroll: 10000,
      hands: 1000,
      description: "Advanced GTO bot with neural network optimization",
      status: "waiting"
    },
    {
      id: 2,
      botName: "BluffMaster",
      player: "Sarah Chen",
      university: "Stanford",
      bankroll: 5000,
      hands: 500,
      description: "Aggressive bot specializing in bluff detection",
      status: "waiting"
    },
    {
      id: 3,
      botName: "MathWiz",
      player: "Mike Johnson",
      university: "Caltech",
      bankroll: 15000,
      hands: 2000,
      description: "Mathematical approach with probability calculations",
      status: "in_game"
    }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Creating game:', formData)
    setShowCreateForm(false)
    setFormData({ botName: '', bankroll: '', hands: '', description: '' })
  }

  const handleChallenge = (gameId) => {
    console.log('Challenging game:', gameId)
    // TODO: Navigate to game or create match
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  type="submit"
                  className="rounded-md bg-gradient-to-r from-red-600 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-red-500 hover:to-blue-500"
                >
                  Post Bot
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
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

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-slate-300">
                  <CurrencyDollarIcon className="h-4 w-4 mr-2 text-green-400" />
                  <span>Bankroll: {game.bankroll.toLocaleString()} credits</span>
                </div>
                <div className="flex items-center text-sm text-slate-300">
                  <HandRaisedIcon className="h-4 w-4 mr-2 text-orange-400" />
                  <span>Hands: {game.hands.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => handleChallenge(game.id)}
                  disabled={game.status === 'in_game'}
                  className="flex-1 rounded-md bg-gradient-to-r from-red-600 to-blue-600 px-3 py-2 text-sm font-medium text-white hover:from-red-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {game.status === 'waiting' ? 'Challenge' : 'In Progress'}
                </button>
                <Link
                  to={`/profile/${game.player.toLowerCase().replace(' ', '-')}`}
                  className="rounded-md bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-500"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>

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