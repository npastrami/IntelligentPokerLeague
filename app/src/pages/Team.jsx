import { useState } from 'react'
import { UserGroupIcon, PlusIcon, MagnifyingGlassIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

export default function Team() {
  const [activeTab, setActiveTab] = useState('myTeam')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    isPrivate: false
  })

  const currentTeam = {
    name: "MIT Poker Warriors",
    description: "Competitive poker bot development team from MIT",
    members: [
      { name: "John Smith", role: "Captain", university: "MIT", joined: "2024-01-15" },
      { name: "Sarah Chen", role: "Developer", university: "MIT", joined: "2024-01-20" },
      { name: "Mike Johnson", role: "Strategist", university: "MIT", joined: "2024-02-01" }
    ],
    isPrivate: false,
    created: "2024-01-15"
  }

  const availableTeams = [
    { id: 1, name: "Stanford Sharks", members: 8, university: "Stanford", isPrivate: false, description: "Advanced AI poker bots" },
    { id: 2, name: "Berkeley Bears", members: 5, university: "Berkeley", isPrivate: true, description: "Machine learning poker strategies" },
    { id: 3, name: "Caltech Coders", members: 11, university: "Caltech", isPrivate: false, description: "Mathematical approach to poker" },
    { id: 4, name: "CMU Cyborgs", members: 7, university: "CMU", isPrivate: false, description: "Hybrid human-AI poker team" }
  ]

  const handleCreateTeam = () => {
    console.log('Creating team:', teamForm)
    setShowCreateModal(false)
    setTeamForm({ name: '', description: '', isPrivate: false })
  }

  const handleJoinTeam = (teamId) => {
    console.log('Joining team:', teamId)
    setShowJoinModal(false)
  }

  const filteredTeams = availableTeams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.university.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#19191E] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Teams</h1>
          <p className="mt-2 text-gray-300">Collaborate with fellow poker enthusiasts</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8">
              {[
                { key: 'myTeam', name: 'My Team' },
                { key: 'browse', name: 'Browse Teams' },
                { key: 'create', name: 'Create Team' }
              ].map(({ key, name }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-[#ff3131] text-[#ff3131]'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* My Team Tab */}
        {activeTab === 'myTeam' && (
          <div className="space-y-6">
            {currentTeam ? (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{currentTeam.name}</h2>
                    <p className="text-gray-300 mt-1">{currentTeam.description}</p>
                    <div className="flex items-center mt-2 text-sm text-gray-400">
                      {currentTeam.isPrivate ? (
                        <LockClosedIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <GlobeAltIcon className="h-4 w-4 mr-1" />
                      )}
                      {currentTeam.isPrivate ? 'Private' : 'Public'} • Created {currentTeam.created}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white mb-3">Team Members ({currentTeam.members.length}/11)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentTeam.members.map((member, i) => (
                      <div key={i} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="bg-[#ff3131] rounded-full w-10 h-10 flex items-center justify-center text-black font-semibold">
                            {member.name.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <p className="text-white font-medium">{member.name}</p>
                            <p className="text-sm text-gray-300">{member.role}</p>
                            <p className="text-xs text-gray-400">{member.university}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-white">No team yet</h3>
                <p className="mt-1 text-sm text-gray-400">Join a team or create your own to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Browse Teams Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search teams..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-[#ff3131] focus:outline-none focus:ring-1 focus:ring-[#ff3131]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map((team) => (
                <div key={team.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                      <p className="text-sm text-gray-300">{team.university}</p>
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      {team.isPrivate ? (
                        <LockClosedIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <GlobeAltIcon className="h-4 w-4 mr-1" />
                      )}
                      {team.isPrivate ? 'Private' : 'Public'}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-4">{team.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{team.members}/11 members</span>
                    <button
                      onClick={() => handleJoinTeam(team.id)}
                      disabled={team.members >= 11}
                      className="px-3 py-1 bg-[#ff3131] text-black text-sm rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {team.members >= 11 ? 'Full' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Team Tab */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">Create New Team</h2>
              
              <form onSubmit={(e) => { e.preventDefault(); handleCreateTeam(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    value={teamForm.name}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-[#ff3131] focus:outline-none focus:ring-1 focus:ring-[#ff3131]"
                    placeholder="Enter team name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={teamForm.description}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-[#ff3131] focus:outline-none focus:ring-1 focus:ring-[#ff3131]"
                    placeholder="Describe your team's goals and strategy"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="private"
                    checked={teamForm.isPrivate}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-[#ff3131] focus:ring-[#ff3131]"
                  />
                  <label htmlFor="private" className="ml-2 text-sm text-white">
                    Private team (invite only)
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md bg-[#ff3131] px-4 py-2 text-sm font-medium text-black hover:bg-red-600"
                >
                  Create Team
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}