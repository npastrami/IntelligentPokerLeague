import { useState } from 'react'
import { TrophyIcon, AcademicCapIcon, CpuChipIcon, UserIcon } from '@heroicons/react/24/outline'

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('overall')

  const leaderboardData = {
    overall: [
      { rank: 1, name: "Sarah Chen", university: "Stanford", type: "bot", winRate: 68.5, games: 2847, earnings: 145000, avatar: "🤖" },
      { rank: 2, name: "Mike Johnson", university: "MIT", type: "human", winRate: 64.2, games: 1923, earnings: 98500, avatar: "👨" },
      { rank: 3, name: "AI_Master_2024", university: "Caltech", type: "bot", winRate: 62.8, games: 3241, earnings: 87300, avatar: "🤖" },
      { rank: 4, name: "Emma Wilson", university: "Berkeley", type: "human", winRate: 61.4, games: 1456, earnings: 76200, avatar: "👩" },
      { rank: 5, name: "PokerBot_v3", university: "CMU", type: "bot", winRate: 59.7, games: 2156, earnings: 65400, avatar: "🤖" },
    ],
    bots: [
      { rank: 1, name: "Sarah Chen", university: "Stanford", type: "bot", winRate: 68.5, games: 2847, earnings: 145000, avatar: "🤖" },
      { rank: 2, name: "AI_Master_2024", university: "Caltech", type: "bot", winRate: 62.8, games: 3241, earnings: 87300, avatar: "🤖" },
      { rank: 3, name: "PokerBot_v3", university: "CMU", type: "bot", winRate: 59.7, games: 2156, earnings: 65400, avatar: "🤖" },
    ],
    humans: [
      { rank: 1, name: "Mike Johnson", university: "MIT", type: "human", winRate: 64.2, games: 1923, earnings: 98500, avatar: "👨" },
      { rank: 2, name: "Emma Wilson", university: "Berkeley", type: "human", winRate: 61.4, games: 1456, earnings: 76200, avatar: "👩" },
    ]
  }

  const tabs = [
    { key: 'overall', name: 'Overall', icon: TrophyIcon },
    { key: 'bots', name: 'Bots Only', icon: CpuChipIcon },
    { key: 'humans', name: 'Humans Only', icon: UserIcon }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-red-900 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="mt-2 text-slate-300">Top performers across all universities</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-slate-700">
            <nav className="flex space-x-8">
              {tabs.map(({ key, name, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    University
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Earnings
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {leaderboardData[activeTab].map((player) => (
                  <tr key={player.rank} className="hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {player.rank === 1 && <TrophyIcon className="h-5 w-5 text-yellow-400 mr-2" />}
                        {player.rank === 2 && <TrophyIcon className="h-5 w-5 text-slate-400 mr-2" />}
                        {player.rank === 3 && <TrophyIcon className="h-5 w-5 text-amber-600 mr-2" />}
                        <span className="text-sm font-medium text-white">#{player.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{player.avatar}</span>
                        <span className="text-sm font-medium text-white">{player.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <AcademicCapIcon className="h-4 w-4 text-blue-400 mr-2" />
                        <span className="text-sm text-slate-300">{player.university}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        player.type === 'bot' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {player.type === 'bot' ? 'Bot' : 'Human'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-slate-700 rounded-full h-2 mr-3">
                          <div 
                            className="bg-gradient-to-r from-red-500 to-blue-500 h-2 rounded-full" 
                            style={{ width: `${player.winRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-white">{player.winRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {player.games.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                      +{player.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Total Players</h3>
            <p className="text-3xl font-bold text-blue-400">1,247</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Active Bots</h3>
            <p className="text-3xl font-bold text-purple-400">856</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Total Prize Pool</h3>
            <p className="text-3xl font-bold text-green-400">$2.4M</p>
          </div>
        </div>
      </div>
    </div>
  )
}