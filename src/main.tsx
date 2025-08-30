import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { processQueue } from './lib/offlineQueue'

const container = document.getElementById('root')!
createRoot(container).render(<App />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
  })

  window.addEventListener('online', () => {
    processQueue()
  })
}

if (navigator.onLine) {
  processQueue()
}
