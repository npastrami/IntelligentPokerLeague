import { Disclosure, Menu } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

const navigation = [
  { name: 'Games', href: '/games', protected: true },
  { name: 'Teams', href: '/teams', protected: true },
  { name: 'Leaderboard', href: '/leaderboard' },
  { name: 'Code Editor', href: '/editor', protected: true },
]

const userNavigation = [
  { name: 'Profile', href: '/profile' },
  { name: 'Sign out', action: 'logout' },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout, updateUser } = useAuth()
  const [addingCoins, setAddingCoins] = useState(false)

  const handleUserAction = async (item) => {
    if (item.action === 'logout') {
      await logout()
      navigate('/')
    } else {
      navigate(item.href)
    }
  }

  const handleGetCoins = async () => {
    setAddingCoins(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8000/api/users/add-coins/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: 10000 })
      })

      if (response.ok) {
        const data = await response.json()
        // Update user context with new coin amount
        updateUser({ ...user, coins: data.coins })
        alert(`Added 10,000 coins! New balance: ${data.coins.toLocaleString()}`)
      } else {
        alert('Failed to add coins. Please try again.')
      }
    } catch (error) {
      console.error('Error adding coins:', error)
      alert('Error adding coins. Please try again.')
    } finally {
      setAddingCoins(false)
    }
  }

  console.log('Navbar state:', { isAuthenticated, user })

  // Filter navigation based on auth status
  const visibleNavigation = navigation.filter(item => 
    !item.protected || isAuthenticated
  )

  return (
    <Disclosure as="nav" className="bg-neutral-800 shadow-lg relative z-50" style={{ pointerEvents: 'auto' }}>
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Link 
                    to="/" 
                    className="flex items-center space-x-3 relative z-10"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <img 
                      src="/iplcardstransparent.png" 
                      alt="IPL Logo" 
                      className="h-14 w-14"
                    />
                    <span 
                      className="text-4xl font-bold text-white"
                      style={{ fontFamily: 'paladinsslaser, sans-serif' }}
                    >
                      IPL
                    </span>
                  </Link>
                </div>
              </div>

              <div className="hidden md:flex flex-1 justify-center">
                <div className="flex items-baseline space-x-4">
                  {visibleNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        location.pathname === item.href
                          ? 'bg-[#ff3131] text-white'
                          : 'text-white hover:bg-[#ff3131] hover:text-white',
                        'rounded-md px-3 py-2 text-sm font-medium transition-colors relative z-10'
                      )}
                      style={{ pointerEvents: 'auto' }}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="hidden md:flex">
                <div className="ml-4 flex items-center md:ml-6 space-x-4">
                  {isAuthenticated && (
                    <>
                      {/* Coins Display */}
                      <div className="bg-gray-300 text-black px-3 py-1 rounded-full text-sm font-semibold">
                        💰 {user?.coins?.toLocaleString() || '0'} coins
                      </div>
                      
                      {/* Get Coins Button */}
                      <button
                        onClick={handleGetCoins}
                        disabled={addingCoins}
                        className="bg-[#ff3131] text-white hover:bg-red-600 disabled:bg-red-400 rounded-md px-3 py-2 text-sm font-medium transition-colors relative z-10"
                        style={{ pointerEvents: 'auto' }}
                      >
                        {addingCoins ? 'Adding...' : 'Get 10K Coins'}
                      </button>
                    </>
                  )}

                  {isAuthenticated ? (
                    /* Profile dropdown */
                    <Menu as="div" className="relative ml-3 z-50">
                      <div>
                        <Menu.Button className="relative flex max-w-xs items-center rounded-full bg-[#ff3131] text-sm text-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-800 z-10">
                          <span className="absolute -inset-1.5" />
                          <span className="sr-only">Open user menu</span>
                          <div className="h-8 w-8 rounded-full bg-[#ff3131] flex items-center justify-center text-black font-semibold">
                            {user?.first_name?.[0]}{user?.last_name?.[0]}
                          </div>
                        </Menu.Button>
                      </div>
                      <Menu.Items className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <p className="text-xs text-[#ff3131] font-semibold">💰 {user?.coins?.toLocaleString() || '0'} coins</p>
                        </div>
                        {userNavigation.map((item) => (
                          <Menu.Item key={item.name}>
                            {({ active }) => (
                              <button
                                onClick={() => handleUserAction(item)}
                                className={classNames(
                                  active ? 'bg-gray-100' : '',
                                  'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                                )}
                              >
                                {item.name}
                              </button>
                            )}
                          </Menu.Item>
                        ))}
                      </Menu.Items>
                    </Menu>
                  ) : (
                    /* Login/Register buttons */
                    <div className="flex space-x-4">
                      <Link
                        to="/login"
                        className="text-white hover:bg-[#ff3131] hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors relative z-10"
                        style={{ pointerEvents: 'auto' }}
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/register"
                        className="bg-[#ff3131] text-white hover:bg-red-600 rounded-md px-3 py-2 text-sm font-medium transition-colors relative z-10"
                        style={{ pointerEvents: 'auto' }}
                      >
                        Sign up
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="-mr-2 flex md:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md bg-[#ff3131] p-2 text-black hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-800 z-10">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="md:hidden relative z-40">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3 bg-white">
              {isAuthenticated && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">💰 {user?.coins?.toLocaleString() || '0'} coins</span>
                  </div>
                  <button
                    onClick={handleGetCoins}
                    disabled={addingCoins}
                    className="w-full bg-[#ff3131] text-white hover:bg-red-600 disabled:bg-red-400 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {addingCoins ? 'Adding...' : 'Get 10K Coins'}
                  </button>
                </div>
              )}
              
              {visibleNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    location.pathname === item.href
                      ? 'bg-[#ff3131] text-white'
                      : 'text-gray-800 hover:bg-[#ff3131] hover:text-white',
                    'block rounded-md px-3 py-2 text-base font-medium transition-colors'
                  )}
                  style={{ pointerEvents: 'auto' }}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {isAuthenticated ? (
              <div className="border-t border-gray-200 pb-3 pt-4 bg-white">
                <div className="flex items-center px-5">
                  <div className="h-10 w-10 rounded-full bg-[#ff3131] flex items-center justify-center text-white font-semibold">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user?.first_name} {user?.last_name}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                    <div className="text-sm text-[#ff3131] font-semibold">💰 {user?.coins?.toLocaleString() || '0'} coins</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 px-2">
                  {userNavigation.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleUserAction(item)}
                      className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-800 hover:bg-gray-100"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-200 pb-3 pt-4 bg-white">
                <div className="space-y-1 px-2">
                  <Link
                    to="/login"
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-800 hover:bg-gray-100"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-800 hover:bg-gray-100"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            )}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}