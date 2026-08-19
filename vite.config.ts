import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import type { ViteDevServer } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    {
      name: 'download-proxy',
      configureServer(server: ViteDevServer) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`)
          if (url.pathname === '/api/download') {
            const imageUrl = url.searchParams.get('url')
            if (!imageUrl) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Missing url parameter' }))
              return
            }

            console.log('[Download Proxy] Starting download for:', imageUrl)
            try {
              const httpModule = imageUrl.startsWith('https') ? await import('https') : await import('http')
              console.log('[Download Proxy] Using module:', imageUrl.startsWith('https') ? 'https' : 'http')
              
              const response = await new Promise<{ statusCode: number; headers: any; data: Buffer }>((resolve, reject) => {
                const handleResponse = (resp: any) => {
                  console.log('[Download Proxy] Remote response status:', resp.statusCode)
                  if (resp.statusCode === 301 || resp.statusCode === 302) {
                    const redirectUrl = resp.headers.location
                    console.log('[Download Proxy] Redirecting to:', redirectUrl)
                    httpModule.get(redirectUrl, handleResponse).on('error', (err) => reject(err))
                    return
                  }
                  if (resp.statusCode !== 200) {
                    reject(new Error(`HTTP error! status: ${resp.statusCode}`))
                    return
                  }

                  console.log('[Download Proxy] Remote response headers:', resp.headers)
                  const chunks: Buffer[] = []
                  resp.on('data', (chunk) => {
                    chunks.push(chunk)
                    console.log('[Download Proxy] Received chunk:', chunk.length, 'bytes')
                  })
                  resp.on('end', () => {
                    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
                    console.log('[Download Proxy] Download complete, total size:', totalSize, 'bytes')
                    resolve({
                      statusCode: resp.statusCode || 200,
                      headers: resp.headers,
                      data: Buffer.concat(chunks),
                    })
                  })
                }
                httpModule.get(imageUrl, handleResponse).on('error', (err) => reject(err))
              })

              const contentType = response.headers['content-type'] || 'image/png'
              const extension = contentType.includes('jpeg') ? 'jpg' : contentType.includes('png') ? 'png' : 'png'
              const filename = `wenyun_pattern_${Date.now()}.${extension}`
              const contentDisposition = `attachment; filename="${filename}"`
              console.log('[Download Proxy] Sending response, Content-Type:', contentType, 'Content-Length:', response.data.length, 'filename:', filename)
              
              res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Disposition': contentDisposition,
                'Content-Length': response.data.length,
              })
              res.end(response.data)
              console.log('[Download Proxy] Response sent successfully')
            } catch (error: any) {
              console.error('[Download Proxy] Error:', error.message || error)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Failed to download image', message: error.message || 'Unknown error' }))
            }
          } else {
            next()
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 把前端 /sd-api/* 转发到本地 sd_proxy.py（默认 http://127.0.0.1:8787）
    // 这样浏览器调 /sd-api/generate 不会触发 CORS，dev 下与 npm run dev 同进程同源
    proxy: {
      '/sd-api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/sd-api/, ''),
      },
    },
  },
})
