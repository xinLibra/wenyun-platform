import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

type Step = 'identify' | 'verify' | 'reset'

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
  if (message.includes('Invalid token') || message.includes('Invalid OTP') || message.includes('OTP is invalid') || message.includes('token is invalid')) {
    return '验证码输入有误'
  }
  if (message.includes('Token expired') || message.includes('OTP has expired') || message.includes('token has expired')) {
    return '验证码已过期，请重新获取'
  }

  return '操作失败，请稍后重试'
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('identify')
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const [countdown, setCountdown] = useState(0)
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth?.getSession()
        if (session?.user) {
          navigate('/')
        }
      } catch (e) {
        console.log('Supabase not configured')
      }
    }
    checkAuth()
  }, [navigate])

  useEffect(() => {
    const savedCooldown = localStorage.getItem('forgot_password_cooldown')
    if (savedCooldown) {
      const endTime = parseInt(savedCooldown, 10)
      const now = Date.now()
      if (now < endTime) {
        setCooldownEndTime(endTime)
        const remaining = Math.ceil((endTime - now) / 1000)
        if (remaining <= 60) {
          setCountdown(remaining)
        }
      } else {
        localStorage.removeItem('forgot_password_cooldown')
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [countdown])

  const handleSendCode = async () => {
    if (!formData.email.trim()) {
      setError('请输入邮箱')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    const now = Date.now()
    if (cooldownEndTime && now < cooldownEndTime) {
      const remainingSeconds = Math.ceil((cooldownEndTime - now) / 1000)
      setError(`请等待${remainingSeconds}秒后再发送`)
      return
    }

    setIsSendingCode(true)
    setError('')

    try {
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(
        formData.email,
        { redirectTo: `${window.location.origin}/login` }
      )
      
      if (supabaseError) {
        setError(translateAuthError(supabaseError))
      } else {
        setMessage('验证码已发送至您的邮箱，请查收')
        setCountdown(180)
        const newCooldownEndTime = now + 3 * 60 * 1000
        setCooldownEndTime(newCooldownEndTime)
        localStorage.setItem('forgot_password_cooldown', newCooldownEndTime.toString())
        setStep('verify')
      }
    } catch (err) {
      setError('发送验证码失败，请稍后重试')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!formData.code.trim()) {
      setError('请输入验证码')
      setIsLoading(false)
      return
    }

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.code,
        type: 'recovery',
      })

      if (verifyError) {
        console.error('Verify OTP error object:', verifyError)
        console.error('Verify OTP error message:', verifyError?.message)
        console.error('Verify OTP error code:', verifyError?.code)
        
        const errorMsg = (verifyError?.message || verifyError?.code || JSON.stringify(verifyError)).toLowerCase()
        
        if (errorMsg.includes('invalid') || errorMsg.includes('otp') || errorMsg.includes('token') || errorMsg.includes('code')) {
          setError('验证码输入有误')
        } else if (errorMsg.includes('expired') || errorMsg.includes('expire')) {
          setError('验证码已过期，请重新获取')
        } else {
          setError('验证码输入有误')
        }
        return
      }

      if (!data.session) {
        setError('验证失败，请重新获取验证码')
        return
      }

      console.log('Verify OTP success, session:', data.session)
      setStep('reset')
    } catch (err) {
      setError('验证失败，请稍后重试')
      console.error('Verify catch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6位')
      setIsLoading(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Current session before updateUser:', session)

      if (!session) {
        setError('会话已过期，请重新获取验证码')
        setStep('identify')
        return
      }

      const { error: supabaseError } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (supabaseError) {
        setError(translateAuthError(supabaseError))
        console.error('Update user error:', supabaseError)
      } else {
        setMessage('密码重置成功，请登录')
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err) {
      setError('重置失败，请稍后重试')
      console.error('Reset catch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-rice-paper flex items-center justify-center py-8 px-4 relative">
      <div className="absolute inset-0 bg-ink-wash opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-rice-paper-light rounded-sm shadow-xl border border-deep-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-deep-blue to-deep-blue-light p-6 text-center">
            <div className="flex justify-center mb-3">
              <Logo variant="navbar" colorScheme="blue-bg" showFull={false} />
            </div>
            <h1 className="text-2xl font-shufa text-rice-paper">
              {step === 'identify' ? '找回密码' : step === 'verify' ? '验证身份' : '重置密码'}
            </h1>
            <p className="text-rice-paper/80 font-song text-sm mt-1">
              {step === 'identify' ? '输入您的邮箱' : step === 'verify' ? '输入收到的验证码' : '设置新密码'}
            </p>
          </div>
          
          {message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 font-song text-center"
            >
              {message}
            </motion.div>
          )}
          
          {step === 'identify' && (
            <form className="p-6 space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-sm font-song text-center"
                >
                  {error}
                </motion.div>
              )}
              
              <div>
                <Input
                  label="邮箱"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="请输入邮箱"
                  className={error ? 'border-red-400' : ''}
                />
              </div>
              
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleSendCode}
                disabled={isSendingCode}
              >
                {isSendingCode ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-rice-paper border-t-transparent rounded-full mr-2"
                    />
                    发送验证码...
                  </>
                ) : (
                  '发送验证码'
                )}
              </Button>
              
              <div className="text-center">
                <span className="font-song text-deep-blue-light">记得密码了？</span>
                <Link
                  to="/login"
                  className="font-song text-palace-red hover:text-palace-red-dark ml-1 transition-colors"
                >
                  立即登录
                </Link>
              </div>
            </form>
          )}
          
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="p-6 space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-sm font-song text-center"
                >
                  {error}
                </motion.div>
              )}
              
              <div>
                <Input
                  label="验证码"
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="请输入8位验证码"
                  className={error ? 'border-red-400' : ''}
                />
              </div>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || isSendingCode}
                  className={`font-song px-6 py-2 rounded-sm transition-colors ${
                    countdown > 0 || isSendingCode
                      ? 'bg-deep-blue-100 text-deep-blue-light cursor-not-allowed'
                      : 'bg-palace-red/10 text-palace-red hover:bg-palace-red/20'
                  }`}
                >
                  {countdown > 0 ? (
                    <span>重新发送验证码 ({countdown}秒)</span>
                  ) : isSendingCode ? (
                    <span>发送中...</span>
                  ) : (
                    <span>重新发送验证码</span>
                  )}
                </button>
                <p className="font-song text-xs text-deep-blue-light mt-1">
                  验证码有效期为3分钟，3分钟后才能再次发送
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep('identify')}
                >
                  返回
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-rice-paper border-t-transparent rounded-full mr-2"
                      />
                      验证中...
                    </>
                  ) : (
                    '验证身份'
                  )}
                </Button>
              </div>
            </form>
          )}
          
          {step === 'reset' && (
            <form onSubmit={handleReset} className="p-6 space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-sm font-song text-center"
                >
                  {error}
                </motion.div>
              )}
              
              <div>
                <Input
                  label="新密码"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="请输入新密码（至少6位）"
                  className={error ? 'border-red-400' : ''}
                />
              </div>
              
              <div>
                <Input
                  label="确认密码"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="请再次输入新密码"
                  className={error ? 'border-red-400' : ''}
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep('verify')}
                >
                  返回
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-rice-paper border-t-transparent rounded-full mr-2"
                      />
                      重置中...
                    </>
                  ) : (
                    '重置密码'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
        
        <p className="text-center font-song text-deep-blue-300 text-xs mt-6">
          找回密码即表示您同意我们的服务条款和隐私政策
        </p>
      </motion.div>
    </div>
  )
}