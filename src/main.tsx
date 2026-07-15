import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { FavoriteProvider } from './context/FavoriteContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <FavoriteProvider>
        <App />
      </FavoriteProvider>
    </BrowserRouter>
  </StrictMode>,
)
