/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'palace-red': '#9E1F36',
        'palace-red-light': '#B8364E',
        'palace-red-dark': '#7A172A',
        'palace-red-100': '#FCE4E8',
        'palace-red-200': '#F8B5C0',
        
        'ming-yellow': '#F4C430',
        'ming-yellow-light': '#F7D45A',
        'ming-yellow-dark': '#D4A825',
        'ming-yellow-100': '#FEF6D0',
        'ming-yellow-200': '#FCEA9B',
        
        'deep-blue': '#1A365D',
        'deep-blue-light': '#2D4A70',
        'deep-blue-dark': '#122540',
        'deep-blue-100': '#E6EDF6',
        'deep-blue-200': '#B3C6E0',
        
        'ink-black': '#1A1A1A',
        'ink-black-light': '#333333',
        'ink-black-100': '#F5F5F5',
        'ink-black-200': '#E5E5E5',
        
        'rice-paper': '#F5F0E6',
        'rice-paper-light': '#FAF7F1',
        'rice-paper-dark': '#E8E0D0',
        
        'shu-red': '#B22222',
        'teng-yellow': '#F4C430',
        'cang-blue': '#1A365D',
        'qing-green': '#2E8B57',
        'dan-xue': '#FFB7C5',
        'bai-jin': '#FFFFF0',
      },
      fontFamily: {
        'kai': ['KaiTi', 'STKaiti', 'serif'],
        'song': ['SimSun', 'STSong', 'serif'],
        'hei': ['SimHei', 'STHeiti', 'sans-serif'],
        'shufa': ['Ma Shan Zheng', 'KaiTi', 'serif'],
        'zhuanke': ['ZCOOL KuaiLe', 'cursive'],
        'liujian': ['Liu Jian Mao Cao', 'cursive'],
      },
      backgroundImage: {
        'rice-paper-texture': "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100\" height=\"100\" filter=\"url(%23noise)\" opacity=\"0.08\"/%3E%3C/svg%3E')",
        'ink-wash': "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"400\" viewBox=\"0 0 400 400\"%3E%3Cdefs%3E%3CradialGradient id=\"ink\" cx=\"50%25\" cy=\"50%25\" r=\"50%25\"%3E%3Cstop offset=\"0%25\" stop-color=\"%231A365D\" stop-opacity=\"0.15\"/%3E%3Cstop offset=\"100%25\" stop-color=\"%231A365D\" stop-opacity=\"0\"/%3E%3C/radialGradient%3E%3C/defs%3E%3Cellipse cx=\"150\" cy=\"250\" rx=\"120\" ry=\"80\" fill=\"url(%23ink)\"/%3E%3Cellipse cx=\"300\" cy=\"150\" rx=\"80\" ry=\"60\" fill=\"url(%23ink)\"/%3E%3Cellipse cx=\"80\" cy=\"100\" rx=\"60\" ry=\"40\" fill=\"url(%23ink)\"/%3E%3C/svg%3E')",
      },
      animation: {
        'scroll-open': 'scrollOpen 1.2s ease-out forwards',
        'ink-spread': 'inkSpread 1s ease-out forwards',
        'stamp-press': 'stampPress 0.3s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      },
      keyframes: {
        scrollOpen: {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '50%': { transform: 'scaleY(1.05)', opacity: '0.8' },
          '100%': { transform: 'scaleY(1)', opacity: '1' },
        },
        inkSpread: {
          '0%': { transform: 'scale(0)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        stampPress: {
          '0%': { transform: 'scale(1.2)', opacity: '0' },
          '50%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
