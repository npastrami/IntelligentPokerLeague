import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth on mount
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = (userData, userToken) => {
    localStorage.setItem('token', userToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(userToken)
    setUser(userData)
  }

  const logout = async () => {
    try {
      // Call logout endpoint if user is authenticated
      if (token) {
        await fetch('http://localhost:8000/api/users/logout/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and state regardless of API call success
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
    }
  }

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const refreshUser = async () => {
    try {
      if (!token) return

      const response = await fetch('http://localhost:8000/api/users/profile/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userData = await response.json()
        updateUser(userData)
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
    }
  }

  const isAuthenticated = !!token && !!user

  const value = {
    user,
    token,
    login,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}