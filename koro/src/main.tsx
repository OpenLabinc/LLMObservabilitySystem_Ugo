import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/fraunces/latin-600-italic.css'
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-600.css'
import { App } from './App'
import { StoreProvider } from './store'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
