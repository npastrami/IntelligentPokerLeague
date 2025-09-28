import { useEffect, useState } from 'react'
import { EyeIcon, EyeSlashIcon, LinkIcon, ArrowDownTrayIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [userBots, setUserBots] = useState([])

  const [profileData, setProfileData] = useState({
    username: 'john_smith',
    email: 'john@mit.edu',
    phone: '+1-555-0123',
    firstName: 'John',
    lastName: 'Smith',
    university: 'MIT',
    major: 'Computer Science'
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [socialLinks, setSocialLinks] = useState({
    linkedin: 'https://linkedin.com/in/johnsmith',
    github: 'https://github.com/johnsmith',
    website: 'https://johnsmith.dev'
  })

  const [stats] = useState({
    gamesPlayed: 247,
    winRate: 64.2,
    totalEarnings: 98500,
    rank: 15,
    botsCreated: 8
  })

  const handleProfileSave = () => {
    console.log('Saving profile:', profileData)
    // TODO: Save to backend
  }

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match')
      return
    }
    console.log('Changing password')
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const handleSocialSave = () => {
    console.log('Saving social links:', socialLinks)
    // TODO: Save to backend
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

  useEffect(() => {
    fetchUserBots();
  }, []);

  return (
    <div className="min-h-screen bg-[#19191E] py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 rounded-full w-20 h-20 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold text-white">{profileData.firstName} {profileData.lastName}</h1>
          <p className="text-slate-300">@{profileData.username} • {profileData.university}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-2xl font-bold text-blue-400">{stats.gamesPlayed}</p>
            <p className="text-sm text-slate-300">Games</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-2xl font-bold text-green-400">{stats.winRate}%</p>
            <p className="text-sm text-slate-300">Win Rate</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-2xl font-bold text-yellow-400">#{stats.rank}</p>
            <p className="text-sm text-slate-300">Rank</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-2xl font-bold text-purple-400">{stats.botsCreated}</p>
            <p className="text-sm text-slate-300">Bots</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-2xl font-bold text-green-400">{stats.totalEarnings.toLocaleString()}</p>
            <p className="text-sm text-slate-300">Earnings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-slate-700">
            <nav className="flex space-x-8">
              {[
                { key: 'profile', name: 'Profile' },
                { key: 'security', name: 'Security' },
                { key: 'social', name: 'Social Links' },
                { key: 'bots', name: 'My Bots' }
              ].map(({ key, name }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleProfileSave(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Username</label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">University</label>
                  <input
                    type="text"
                    value={profileData.university}
                    onChange={(e) => setProfileData(prev => ({ ...prev, university: e.target.value }))}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Major</label>
                  <input
                    type="text"
                    value={profileData.major}
                    onChange={(e) => setProfileData(prev => ({ ...prev, major: e.target.value }))}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-[#ff3131] px-4 py-2 text-sm font-medium text-white hover:from-red-500 hover:to-blue-500"
              >
                Save Profile
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Change Password</h2>
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 pr-10 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 pr-10 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-[#ff3131] px-4 py-2 text-sm font-medium text-white hover:from-red-500 hover:to-blue-500"
              >
                Change Password
              </button>
            </form>
          </div>
        )}

        {/* Social Links Tab */}
        {activeTab === 'social' && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Social Links</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSocialSave(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">LinkedIn Profile</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="url"
                    value={socialLinks.linkedin}
                    onChange={(e) => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">GitHub Profile</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="url"
                    value={socialLinks.github}
                    onChange={(e) => setSocialLinks(prev => ({ ...prev, github: e.target.value }))}
                    placeholder="https://github.com/username"
                    className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Personal Website</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="url"
                    value={socialLinks.website}
                    onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourwebsite.com"
                    className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-[#ff3131] px-4 py-2 text-sm font-medium text-white"
              >
                Save Links
              </button>
            </form>
          </div>
        )}
      {/* My Bots */}
      {activeTab === "bots" && (
        <div className="p-6">
          {/* Bots grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Add Bot card */}
            <div className="flex items-center justify-center bg-gray-700 rounded-2xl shadow-md p-5 hover:shadow-lg hover:bg-gray-600 transition cursor-pointer">
              <PlusIcon className="w-10 h-10 text-white" />
            </div>

            {userBots.map((bot, index) => (
              <div
                key={index}
                className="relative bg-gray-800 rounded-2xl shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition"
              >
                {/* Download icon button in top-right */}
                <button className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-700 transition">
                  <ArrowDownTrayIcon className="w-6 h-6 text-white" />
                </button>

                {/* Bot Info */}
                <div>
                  <h2 className="text-xl font-semibold text-white">{bot.name}</h2>
                  <p className="text-white mt-2">{bot.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}