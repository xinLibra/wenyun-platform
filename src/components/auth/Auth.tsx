import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Logo } from '../ui/Logo'

function translateAuthError(error: any): string {
  const message = error?.message || ''

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return '网络连接失败，请检查网络后重试'
  }
  if (message.includes('Invalid login credentials')) {
    return '邮箱或密码不正确'
  }
  if (message.includes('Email not confirmed')) {
    return '邮箱尚未验证，请先查收验证邮件'
  }
  if (message.includes('User already registered')) {
    return '该邮箱已被注册，请直接登录'
  }
  if (message.includes('Password should be at least 6 characters')) {
    return '密码至少需要6位字符'
  }
  if (message.includes('Rate limit exceeded')) {
    return '操作过于频繁，请稍后重试'
  }
  if (message.includes('Invalid email')) {
    return '请输入有效的邮箱地址'
  }
  if (message.includes('Unauthorized')) {
    return '未授权，请重新登录'
  }
  if (message.includes('Session expired')) {
    return '会话已过期，请重新登录'
  }
  if (message.includes('Invalid token')) {
    return '验证码无效或已过期'
  }
  if (message.includes('Token expired')) {
    return '验证码已过期，请重新获取'
  }

  return '操作失败，请稍后重试'
}

interface AuthProps {
  onClose: () => void
  onLogin: () => void
  initialMode?: 'login' | 'register'
}

export function Auth({ onClose, onLogin, initialMode = 'login' }: AuthProps) {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('请填写邮箱和密码')
      return
    }

    if (!isLogin) {
      if (!nickname.trim()) {
        setError('请输入昵称')
        return
      }
      if (nickname.length < 2 || nickname.length > 20) {
        setError('昵称长度应在2-20个字符之间')
        return
      }
      if (password !== confirmPassword) {
        setError('两次密码输入不一致')
        return
      }
    }

    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        localStorage.removeItem('is_guest')
        onLogin()
        onClose()
      } else {
        const origin = window.location.origin
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${origin}/login`,
            data: {
              name: nickname.trim(),
            },
          },
        })
        if (error) throw error
        localStorage.removeItem('is_guest')
        onLogin()
        onClose()
      }
    } catch (err: any) {
      console.error('[Auth] Auth error:', err)
      setError(translateAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <div className="bg-rice-paper-light rounded-sm shadow-xl border border-deep-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-deep-blue to-deep-blue-light p-6 text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-rice-paper/80 hover:text-rice-paper transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex justify-center mb-3">
              <Logo variant="navbar" colorScheme="blue-bg" showFull={false} />
            </div>
            <h2 className="text-2xl font-shufa text-rice-paper">
              {isLogin ? '登录账号' : '注册账号'}
            </h2>
            <p className="font-song text-rice-paper/80 text-sm mt-2">
              {isLogin ? '欢迎回来，请登录您的账号' : '创建新账号，开启非遗纹样创作之旅'}
            </p>
          </div>

          <div className="p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-palace-red/10 text-palace-red font-song text-sm rounded-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-song text-deep-blue mb-2">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue focus:outline-none focus:border-palace-red transition-colors"
                  placeholder="请输入邮箱地址"
                />
              </div>

              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="block font-song text-deep-blue mb-2">昵称</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-4 py-3 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue focus:outline-none focus:border-palace-red transition-colors"
                      placeholder="请输入昵称（2-20个字符）"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block font-song text-deep-blue mb-2">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue focus:outline-none focus:border-palace-red transition-colors"
                    style={{ appearance: 'none', WebkitAppearance: 'none' }}
                    placeholder="请输入密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-deep-blue-light hover:text-palace-red transition-colors"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      ) : (
                        <>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="block font-song text-deep-blue mb-2">确认密码</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue focus:outline-none focus:border-palace-red transition-colors"
                      placeholder="请再次输入密码"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-palace-red text-rice-paper font-song font-medium rounded-sm hover:bg-palace-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-rice-paper border-t-transparent rounded-full mr-2"
                    />
                    {isLogin ? '登录中...' : '注册中...'}
                  </span>
                ) : (
                  isLogin ? '登录' : '注册'
                )}
              </button>
            </form>

            {isLogin && (
            <button
              onClick={() => { onClose(); navigate('/forgot-password'); }}
              className="mt-4 w-full py-2 font-song text-deep-blue-light hover:text-palace-red transition-colors text-sm"
            >
              忘记密码？
            </button>
          )}
          
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="mt-6 w-full py-2 font-song text-deep-blue-light hover:text-palace-red transition-colors"
          >
            {isLogin ? '还没有账号？点击注册' : '已有账号？点击登录'}
          </button>

            <div className="mt-6 pt-4 border-t border-deep-blue-100">
              <p className="font-song text-xs text-deep-blue-light text-center">
                登录即表示您同意我们的服务条款和隐私政策
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}