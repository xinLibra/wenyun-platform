import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname, search, hash } = useLocation()
  
  useEffect(() => {
    const handleScroll = () => {
      if (hash) {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)))
        if (target) {
          window.scrollTo({ top: Math.max(0, target.offsetTop - 80), behavior: 'auto' })
          return
        }
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }

    handleScroll()

    const timer = setTimeout(handleScroll, 100)
    const timer2 = setTimeout(handleScroll, 300)

    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
    }
  }, [pathname, search, hash])
  
  return null
}
