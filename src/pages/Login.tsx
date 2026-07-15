import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { translateAuthError } from '../lib/authErrors'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
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
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      
      if (error) {
        setServerError(translateAuthError(error.message))
      } else {
        navigate('/')
      }
    } catch (err) {
      setServerError('登录失败，请稍后重试')
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
          <div className="bg-gradient-to-r from-deep-blue to-deep-blue-light p-6 text-center">
            <div className="flex justify-center mb-3">
            <Logo variant="navbar" colorScheme="blue-bg" showFull={false} />
          </div>
            <h1 className="text-2xl font-shufa text-rice-paper">登录账号</h1>
            <p className="text-rice-paper/80 font-song text-sm mt-1">欢迎回到纹韵</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                placeholder="请输入密码"
                className={errors.password ? 'border-red-400' : ''}
              />
              {errors.password && (
                <p className="text-red-500 text-sm font-song mt-1">{errors.password}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-palace-red rounded border-deep-blue-300 focus:ring-palace-red"
                />
                <span className="font-song text-sm text-deep-blue-light">记住我</span>
              </label>
              <Link
                to="/forgot-password"
                className="font-song text-sm text-deep-blue-light hover:text-palace-red transition-colors"
              >
                忘记密码？
              </Link>
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
                  登录中...
                </>
              ) : (
                '立即登录'
              )}
            </Button>
            
            <div className="text-center">
              <span className="font-song text-deep-blue-light">还没有账号？</span>
              <Link
                to="/register"
                className="font-song text-palace-red hover:text-palace-red-dark ml-1 transition-colors"
              >
                立即注册
              </Link>
            </div>
          </form>
        </div>
        
        <p className="text-center font-song text-deep-blue-300 text-xs mt-6">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </motion.div>
    </div>
  )
}