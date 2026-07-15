import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { translateAuthError } from '../lib/authErrors'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [serverError, setServerError] = useState('')

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

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }
    
    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6位'
    }
    
    if (!formData.nickname.trim()) {
      newErrors.nickname = '请输入昵称'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsLoading(true)
    setServerError('')
    
    try {
      const origin = window.location.origin
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { nickname: formData.nickname },
          emailRedirectTo: `${origin}/login`,
        },
      })
      
      if (error) {
        console.error('[Register] Sign up error:', error)
        const errorMessage = error.message || '注册失败，请稍后重试'
        setServerError(translateAuthError(errorMessage))
      } else if (data.session) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.session.user.id,
            nickname: formData.nickname,
          })
        navigate('/')
      } else if (data.user) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            nickname: formData.nickname,
          })
        setSuccessMessage('注册成功，请查收邮箱完成验证')
        setFormData({ email: '', password: '', nickname: '' })
        setTimeout(() => navigate('/login'), 3000)
      } else {
        setSuccessMessage('注册成功，请查收邮箱完成验证')
        setFormData({ email: '', password: '', nickname: '' })
        setTimeout(() => navigate('/login'), 3000)
      }
    } catch (err: any) {
      console.error('[Register] Sign up catch error:', err)
      setServerError('注册失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
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
          <div className="bg-gradient-to-r from-palace-red to-palace-red-dark p-6 text-center">
            <div className="flex justify-center mb-3">
              <Logo variant="navbar" colorScheme="red-bg" showFull={false} />
            </div>
            <h1 className="text-2xl font-shufa text-rice-paper">注册账号</h1>
            <p className="text-rice-paper/80 font-song text-sm mt-1">开启非遗纹样创作之旅</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {successMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-sm font-song text-center"
              >
                {successMessage}
              </motion.div>
            )}
            
            {serverError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-sm font-song text-center"
              >
                {serverError}
              </motion.div>
            )}
            
            <div>
              <Input
                label="邮箱"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="请输入邮箱地址"
                className={errors.email ? 'border-red-400' : ''}
              />
              {errors.email && (
                <p className="text-red-500 text-sm font-song mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <Input
                label="密码"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="请输入密码（至少6位）"
                className={errors.password ? 'border-red-400' : ''}
              />
              {errors.password && (
                <p className="text-red-500 text-sm font-song mt-1">{errors.password}</p>
              )}
            </div>
            
            <div>
              <Input
                label="昵称"
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="请输入昵称"
                className={errors.nickname ? 'border-red-400' : ''}
              />
              {errors.nickname && (
                <p className="text-red-500 text-sm font-song mt-1">{errors.nickname}</p>
              )}
            </div>
            
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-rice-paper border-t-transparent rounded-full mr-2"
                  />
                  注册中...
                </>
              ) : (
                '立即注册'
              )}
            </Button>
            
            <div className="text-center">
              <span className="font-song text-deep-blue-light">已有账号？</span>
              <Link
                to="/login"
                className="font-song text-palace-red hover:text-palace-red-dark ml-1 transition-colors"
              >
                立即登录
              </Link>
            </div>
          </form>
        </div>
        
        <p className="text-center font-song text-deep-blue-300 text-xs mt-6">
          注册即表示您同意我们的服务条款和隐私政策
        </p>
      </motion.div>
    </div>
  )
}