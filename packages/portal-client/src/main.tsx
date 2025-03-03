  <script>
      alert('window.global and window.process.env are set in main')
    </script>
import './utils/polyfills/polyfills'
import './utils/polyfills/processBrowser'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
console.log('bottom of main')
