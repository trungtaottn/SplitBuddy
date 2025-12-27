import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { User, AuthResponse, ApiResponse } from '@/types/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('access_token')

    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    // Clear all cached data from previous user
    queryClient.clear()
    
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    })

    const { user, access_token } = response.data.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  const register = async (email: string, password: string, fullName: string) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
      email,
      password,
      full_name: fullName,
    })

    const { user, access_token } = response.data.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
    // Clear all cached data when logging out
    queryClient.clear()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
