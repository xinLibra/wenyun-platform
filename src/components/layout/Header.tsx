import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, Profile } from '../../lib/supabase'
import { Auth } from '../auth/Auth'
import { Logo } from '../ui/Logo'

interface HeaderProps {
  onAuthOpen?: () => void
}

const navItems = [
  { path: '/', label: '首页' },
  { path: '/create', label: '创作纹样' },
  { path: '/customize', label: '定制产品' },
  { path: '/gallery', label: '作品展示' },
  { path: '/about', label: '关于我们' },
  { path: '/help', label: '帮助中心' },
]

export default function Header({ onAuthOpen }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const handleLoginOpen = () => {
    setAuthMode('login')
    if (onAuthOpen) {
      onAuthOpen()
    } else {
      setIsAuthModalOpen(true)
    }
  }

  const handleRegisterOpen = () => {
    setAuthMode('register')
    if (onAuthOpen) {
      onAuthOpen()
    } else {
      setIsAuthModalOpen(true)
    }
  }
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavClick = (path: string) => {
    navigate(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (profileData) {
          setProfile(profileData)
        }
      } catch (e) {
        console.log('Failed to fetch profile')
      }
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth?.getSession()
        if (session?.user) {
          setIsLoggedIn(true)
          setUserEmail(session.user.email || '')
          await fetchProfile(session.user.id)
        }
      } catch (e) {
        console.log('Supabase not configured, running in demo mode')
      }
    }
    checkAuth()

    try {
      supabase.auth?.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setIsLoggedIn(true)
          setUserEmail(session.user.email || '')
          await fetchProfile(session.user.id)
          if (session.user.email) {
            localStorage.removeItem('is_guest')
          }
        } else {
          setIsLoggedIn(false)
          setUserEmail('')
          setProfile(null)
        }
      })
    } catch (e) {
      console.log('Supabase not configured, running in demo mode')
    }

    const handleProfileUpdated = async (event: Event) => {
      const userId = (event as CustomEvent).detail?.userId
      if (userId) {
        await fetchProfile(userId)
      }
    }

    window.addEventListener('profileUpdated', handleProfileUpdated)
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdated)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth?.signOut()
    } catch (e) {
      console.log('Supabase not configured')
    }
    setIsLoggedIn(false)
    setUserEmail('')
    setProfile(null)
    setIsDropdownOpen(false)
  }

  const handleGuestLogin = async () => {
    try {
      console.log('[Guest Login] Attempting anonymous sign-in')
      const { data, error } = await supabase.auth?.signInAnonymously()
      
      console.log('[Guest Login] Result:', { data, error })
      
      if (error) {
        console.error('Anonymous login error:', error)
        if (error.message.includes('Anonymous auth is disabled')) {
          alert('游客体验功能暂未开放，请先注册登录')
        } else {
          alert(`游客体验登录失败: ${error.message}`)
        }
        return
      }
      
      if (data.session) {
        localStorage.setItem('is_guest', 'true')
        window.location.href = '/create'
      } else {
        console.error('[Guest Login] No session returned')
        alert('游客体验登录失败，请重试')
      }
    } catch (e: any) {
      console.error('Anonymous login catch error:', e)
      alert(`游客体验登录失败: ${e.message || '未知错误'}`)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleBeforeUnmount = () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnmount)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnmount)
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-rice-paper/95 backdrop-blur-sm shadow-md' : 'bg-transparent'
        }`}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <Logo variant="navbar" colorScheme="light" showFull={false} />
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path === '/gallery' && location.pathname.startsWith('/gallery/'))
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`font-song text-base transition-all duration-300 relative ${
                    isActive
                      ? 'text-palace-red'
                      : 'text-deep-blue hover:text-palace-red'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-palace-red" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="hidden md:flex items-center space-x-3">
          {isLoggedIn ? (
            <>
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-4 py-2 font-song text-deep-blue hover:text-palace-red transition-colors flex items-center"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-deep-blue-200 mr-2">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-deep-blue flex items-center justify-center">
                        <span className="text-rice-paper text-sm">{(profile?.nickname || userEmail).charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  {profile?.nickname || userEmail.split('@')[0] || '游客'}
                  {localStorage.getItem('is_guest') === 'true' && (
                    <span className="ml-1 px-1.5 py-0.5 bg-ming-yellow/50 text-deep-blue text-xs font-song rounded-sm">游客</span>
                  )}
                  <svg className={`w-4 h-4 ml-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-rice-paper border border-deep-blue-200 rounded-sm shadow-lg z-50"
                    >
                      <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-4 py-2 font-song text-deep-blue hover:bg-deep-blue-100 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        个人中心
                      </Link>
                      <Link 
                        to="/my-works" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-4 py-2 font-song text-deep-blue hover:bg-deep-blue-100 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        我的作品
                      </Link>
                      <Link 
                        to="/my-favorites" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-4 py-2 font-song text-deep-blue hover:bg-deep-blue-100 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        我的收藏
                      </Link>
                      <Link 
                        to="/cart" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-4 py-2 font-song text-deep-blue hover:bg-deep-blue-100 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        购物车
                      </Link>
                      <Link 
                        to="/orders" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-4 py-2 font-song text-deep-blue hover:bg-deep-blue-100 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        我的订单
                      </Link>
                      <button 
                        onClick={handleLogout} 
                        className="w-full text-left px-4 py-2 font-song text-deep-blue hover:bg-deep-blue-100 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        退出登录
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleGuestLogin}
                className="px-4 py-2 bg-ming-yellow text-deep-blue font-song font-medium rounded-sm hover:bg-ming-yellow-light transition-all duration-300 shadow-md hover:shadow-lg"
              >
                游客体验
              </button>
              <button 
                onClick={handleLoginOpen}
                className="px-4 py-2 font-song text-deep-blue hover:text-palace-red transition-colors relative group"
              >
                登录
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-palace-red transition-all duration-300 group-hover:w-full" />
              </button>
              <button 
                onClick={handleRegisterOpen}
                className="px-5 py-2 bg-palace-red text-rice-paper font-song rounded-sm hover:bg-palace-red-dark transition-all duration-300 shadow-md hover:shadow-lg relative overflow-hidden"
              >
                <span className="relative z-10">注册</span>
                <span className="absolute inset-0 bg-gradient-to-r from-palace-red-dark to-palace-red-light opacity-0 hover:opacity-100 transition-opacity" />
              </button>
            </>
          )}
        </div>

          <button
            className="md:hidden p-2 text-deep-blue"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink-black/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-rice-paper-light border-t border-deep-blue-100 relative z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto"
            >
              <nav className="flex flex-col py-4">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path || 
                    (item.path === '/gallery' && location.pathname.startsWith('/gallery/'))
                  return (
                    <button
                      key={item.path}
                      onClick={() => { setIsMobileMenuOpen(false); handleNavClick(item.path) }}
                      className={`px-4 py-3 font-song text-base transition-colors ${
                        isActive ? 'text-palace-red bg-palace-red-100' : 'text-deep-blue hover:bg-deep-blue-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
                <div className="px-4 py-4 space-y-2">
                  {isLoggedIn ? (
                    <>
                      <div className="flex items-center gap-2 px-4 py-2 bg-deep-blue/10 rounded-sm">
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-deep-blue-200">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="头像" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-deep-blue flex items-center justify-center">
                              <span className="text-rice-paper text-sm">{(profile?.nickname || userEmail).charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <span className="font-song text-deep-blue">{profile?.nickname || userEmail.split('@')[0]}</span>
                      </div>
                      <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block w-full px-4 py-2 font-song text-deep-blue border border-deep-blue-200 rounded-sm text-center">
                        个人中心
                      </Link>
                      <Link to="/my-works" onClick={() => setIsMobileMenuOpen(false)} className="block w-full px-4 py-2 font-song text-deep-blue border border-deep-blue-200 rounded-sm text-center">
                        我的作品
                      </Link>
                      <Link to="/my-favorites" onClick={() => setIsMobileMenuOpen(false)} className="block w-full px-4 py-2 font-song text-deep-blue border border-deep-blue-200 rounded-sm text-center">
                        我的收藏
                      </Link>
                      <Link to="/cart" onClick={() => setIsMobileMenuOpen(false)} className="block w-full px-4 py-2 font-song text-deep-blue border border-deep-blue-200 rounded-sm text-center">
                        购物车
                      </Link>
                      <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="block w-full px-4 py-2 font-song text-deep-blue border border-deep-blue-200 rounded-sm text-center">
                        我的订单
                      </Link>
                      <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false) }} className="w-full px-4 py-2 font-song text-deep-blue border border-deep-blue-200 rounded-sm">
                        退出登录
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { handleGuestLogin(); setIsMobileMenuOpen(false) }}
                        className="w-full px-4 py-2 bg-ming-yellow text-deep-blue font-song font-medium rounded-sm"
                      >
                        游客体验
                      </button>
                      <button 
                        onClick={() => { handleLoginOpen(); setIsMobileMenuOpen(false) }}
                        className="block w-full px-4 py-2 font-song text-deep-blue border border-deep-blue-200 rounded-sm text-center"
                      >
                        登录
                      </button>
                      <button 
                        onClick={() => { handleRegisterOpen(); setIsMobileMenuOpen(false) }}
                        className="block w-full px-4 py-2 bg-palace-red text-rice-paper font-song rounded-sm text-center"
                      >
                        注册
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </motion.header>

    <AnimatePresence>
      {isAuthModalOpen && (
        <Auth 
          onClose={() => setIsAuthModalOpen(false)} 
          onLogin={() => {}}
          initialMode={authMode}
        />
      )}
    </AnimatePresence>
    </>
  )
}
