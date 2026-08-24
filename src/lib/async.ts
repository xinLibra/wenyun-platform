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
