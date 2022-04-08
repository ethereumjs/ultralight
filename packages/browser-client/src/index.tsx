import { ChakraProvider, theme } from '@chakra-ui/react'
import React from 'react'
import ReactDOM from 'react-dom'
import { App } from './App'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.unregister()
  })
}

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
