/**
 * 异步请求超时工具：
 * 所有可能挂起的异步路径（getSession / Supabase 查询 / 保存）都必须用它包一层，
 * 超时即 reject，调用方在 catch/finally 里结束 loading，禁止无限转圈。
 */
export function withTimeout<T>(
  promise: PromiseLike<T> | undefined | null,
  ms: number,
  label = '请求'
): Promise<T> {
  if (promise == null) {
    return Promise.reject(new Error(`${label}不可用（Supabase 未配置）`))
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}超时（超过 ${Math.round(ms / 1000)} 秒），请检查网络后重试`))
    }, ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/** 简单延时（自动重试间隔用） */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface ErrorInfo {
  /** network=连不上服务器；timeout=响应超时；auth=登录失效；other=数据库/RLS 等其它错误 */
  kind: 'network' | 'timeout' | 'auth' | 'other'
  /** 面向用户的可读文案 */
  message: string
}

/**
 * 把各种失败（TypeError: Failed to fetch / 超时 / 401 / Supabase 查询错误）归类为可读文案。
 * 注意：不要依赖 console 里「空 Error {}」判断失败原因，
 * 分类依据优先取 message/cause/name，最后才是对象本身。
 */
export function classifyError(err: any, fallback = '请求失败，请重试'): ErrorInfo {
  const msg = String((err as any)?.message || '')
  const low = msg.toLowerCase()
  const causeMsg = String((err as any)?.cause?.message || '')

  if (msg.includes('超时') || low.includes('timeout') || low.includes('timed out')) {
    return { kind: 'timeout', message: '服务器响应超时，请稍后重试' }
  }
  if (
    low === 'failed to fetch' ||
    low.includes('failed to fetch') ||
    low.includes('networkerror') ||
    low.includes('network error') ||
    low.includes('net::err_') ||
    msg === 'TypeError' ||
    (err instanceof TypeError) ||
    !!causeMsg ||
    typeof navigator !== 'undefined' && navigator.onLine === false
  ) {
    return { kind: 'network', message: '无法连接服务器，请检查网络' }
  }
  if (
    (err as any)?.status === 401 ||
    (err as any)?.code === 401 ||
    (err as any)?.statusCode === 401 ||
    low.includes('401') ||
    low.includes('jwt') ||
    low.includes('unauthorized') ||
    low.includes('请先登录')
  ) {
    return { kind: 'auth', message: '登录状态已失效，请重新登录' }
  }
  return { kind: 'other', message: msg || fallback }
}

/**
 * 排查 Failed to fetch 用的诊断日志（不打印 secret / 完整 key）：
 * 只输出 URL 是否存在、是否 https、host、anon key 是否配置、浏览器在线状态。
 * 配合浏览器 Network 面板可区分：项目 Paused / DNS 失败 / CORS / 网络断线。
 */
export function logSupabaseConfig(scope: string) {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || ''
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''
  console.info(`[${scope}] Supabase config (no secrets):`, {
    hasUrl: !!url,
    isHttps: url.startsWith('https://'),
    urlHost: url ? url.replace(/^https?:\/\//, '').split('/')[0] : '(empty)',
    hasAnonKey: !!anonKey,
    anonKeyPrefix: anonKey ? anonKey.slice(0, 4) : '(empty)',
    navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
  })
}
