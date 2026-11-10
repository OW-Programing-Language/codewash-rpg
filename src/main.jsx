import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { installErrorCapture } from './utils/errorLog'

// Capture runtime errors so the Bug Report feature can attach them.
installErrorCapture()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)