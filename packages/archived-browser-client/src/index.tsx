import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.unregister()
  })
}

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(<App />)
