import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname, search } = useLocation()
  
  useEffect(() => {
    const handleScroll = () => {
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
  }, [pathname, search])
  
  return null
}
