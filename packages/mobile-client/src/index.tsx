import { ColorModeScript } from '@chakra-ui/react'
import * as React from 'react'
import ReactDOM from 'react-dom'
import { App } from './App'
import './App.css'

ReactDOM.render(
  <React.StrictMode>
    <ColorModeScript />
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
