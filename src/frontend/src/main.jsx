import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize Telegram WebApp
const initTMA = () => {
  const WebApp = window.Telegram?.WebApp

  if (WebApp) {
    WebApp.ready()
    WebApp.expand()

    // Set theme
    if (WebApp.themeParams?.bg_color) {
      document.documentElement.style.backgroundColor = WebApp.themeParams.bg_color
    }

    // Hide back button
    WebApp.BackButton.hide()
  }
}

initTMA()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
