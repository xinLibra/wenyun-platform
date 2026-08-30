import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : ({} as SupabaseClient)

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Pattern {
  id: string
  user_id: string
  style: string
  color_scheme: string
  complexity: number
  detail: number
  symmetry: string
  image_url: string
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  generation_id: string
  created_at: string
}

export interface Profile {
  id: string
  nickname: string
  avatar_url: string | null
  created_at: string
}

export interface Generation {
  id: string
  user_id: string
  style_id: string | null
  params: Record<string, any>
  image_url: string
  author_nickname: string
  is_public: boolean
  created_at: string
  tags: string[]
  /** 软删除标记：作者删除后置 true，行保留（favorites 关联不失效） */
  is_deleted?: boolean
  deleted_at?: string | null
}

export interface Order {
  id: string
  user_id: string
  product_id: string
  generation_id: string
  customization: Record<string, any>
  status: string
  created_at: string
}