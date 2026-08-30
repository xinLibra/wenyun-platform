import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile, Generation } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { BranchDivider } from '../components/decorations/IceCrackDivider'

export default function ProfilePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedNickname, setEditedNickname] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [generations, setGenerations] = useState<Generation[]>([])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth?.getSession()
        
        if (!session?.user) {
          navigate('/login')
          return
        }

        setEmail(session.user.email || '')

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setEditedNickname(profileData.nickname || '')
        }

        const { data: generationsData } = await supabase
          .from('generations')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })

        if (generationsData) {
          setGenerations(generationsData)
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
        navigate('/login')
      }
    }

    fetchProfile()
  }, [navigate])

  const handlePublicToggle = async (generationId: string, currentPublic: boolean) => {
    const newValue = !currentPublic
    setGenerations((prev) =>
      prev.map((g) => (g.id === generationId ? { ...g, is_public: newValue } : g))
    )

    const { error } = await supabase
      .from('generations')
      .update({ is_public: newValue })
      .eq('id', generationId)

    if (error) {
      setGenerations((prev) =>
        prev.map((g) => (g.id === generationId ? { ...g, is_public: !newValue } : g))
      )
      alert('设置失败，请重试')
    }
  }

  const handleSaveNickname = async () => {
    if (!editedNickname.trim()) {
      setError('昵称不能为空')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth?.getSession()
      if (!session?.user) return

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nickname: editedNickname.trim() })
        .eq('id', session.user.id)

      if (updateError) {
        setError('保存失败，请稍后重试')
      } else {
        setProfile((prev) => prev ? { ...prev, nickname: editedNickname.trim() } : null)
        setIsEditing(false)
      }
    } catch (err) {
      setError('保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) return

    setIsUploading(true)
    setError('')

    const ext = file.name.split('.').pop() || 'png'
    const fileName = `avatar_${Date.now()}.${ext}`
    const filePath = `${session.user.id}/${fileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Avatar upload error:', uploadError)
        setError(`头像上传失败: ${uploadError.message}`)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      if (!publicUrl) {
        setError('头像上传失败，请稍后重试')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)

      if (updateError) {
        setError('头像保存失败，请稍后重试')
      } else {
        setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null)
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { userId: session.user.id } }))
      }
    } catch (err) {
      setError('头像上传失败，请稍后重试')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth?.signOut()
      navigate('/')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-rice-paper flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-palace-red border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="font-song text-deep-blue">加载中...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rice-paper py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
            >
              个人中心
            </motion.h1>
            <BranchDivider />
            <p className="font-song text-deep-blue-light mt-4">管理您的账号信息</p>
          </div>

          <FrameDecorations className="bg-rice-paper-light p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-sm font-song text-center mb-6"
              >
                {error}
              </motion.div>
            )}

            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-deep-blue-200 shadow-lg">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="头像"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-deep-blue-100 flex items-center justify-center">
                      <svg className="w-12 h-12 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-palace-red rounded-full flex items-center justify-center text-rice-paper shadow-md hover:bg-palace-red-dark transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-rice-paper border-t-transparent rounded-full"
                    />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <span className="font-song text-deep-blue-light text-sm">点击头像更换</span>
            </div>

            <div className="space-y-6">
              <div className="bg-rice-paper p-4 rounded-sm">
                <label className="block font-song text-deep-blue-light text-sm mb-2">昵称</label>
                {isEditing ? (
                  <div className="flex items-center space-x-3">
                    <Input
                      value={editedNickname}
                      onChange={(e) => setEditedNickname(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleSaveNickname}
                      disabled={isSaving}
                    >
                      {isSaving ? '保存中...' : '保存'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false)
                        setEditedNickname(profile.nickname || '')
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-song text-deep-blue text-lg">{profile.nickname}</span>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="font-song text-palace-red hover:text-palace-red-dark text-sm flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      编辑
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-rice-paper p-4 rounded-sm">
                <label className="block font-song text-deep-blue-light text-sm mb-2">邮箱</label>
                <div className="flex items-center justify-between">
                  <span className="font-song text-deep-blue">{email}</span>
                  <span className="font-song text-deep-blue-300 text-sm">不可修改</span>
                </div>
              </div>

              <div className="bg-rice-paper p-4 rounded-sm">
                <label className="block font-song text-deep-blue-light text-sm mb-2">注册时间</label>
                <span className="font-song text-deep-blue">
                  {new Date(profile.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleLogout}
              >
                退出登录
              </Button>
            </div>
          </FrameDecorations>

          {generations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8"
            >
              <FrameDecorations className="bg-rice-paper-light p-6">
                <h2 className="font-shufa text-xl text-deep-blue mb-4 flex items-center">
                  <span className="w-8 h-8 bg-ming-yellow/50 rounded-sm flex items-center justify-center text-deep-blue mr-3 text-sm">作</span>
                  我的作品
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generations.map((generation, index) => (
                    <motion.div
                      key={generation.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="bg-rice-paper rounded-sm border border-deep-blue-100 overflow-hidden">
                        <div className="aspect-square bg-rice-paper-dark overflow-hidden">
                          <img
                            src={generation.image_url}
                            alt="纹样作品"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-song text-xs text-deep-blue-light">
                              {new Date(generation.created_at).toLocaleDateString('zh-CN')}
                            </span>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={generation.is_public}
                                onChange={() => handlePublicToggle(generation.id, generation.is_public)}
                                className="w-4 h-4 text-palace-red border-deep-blue-200 rounded-sm focus:ring-palace-red"
                              />
                              <span className="ml-2 font-song text-xs text-deep-blue-light">
                                {generation.is_public ? '已公开' : '私密'}
                              </span>
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const proxyUrl = `/.netlify/functions/download?url=${encodeURIComponent(generation.image_url)}`
                                const link = document.createElement('a')
                                link.href = proxyUrl
                                link.download = `纹韵纹样_${generation.id}.png`
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                              className="flex-1 py-1.5 bg-rice-paper border border-palace-red rounded-sm font-song text-xs text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors"
                            >
                              下载
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </FrameDecorations>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}