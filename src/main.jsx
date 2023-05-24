import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import startServer from '../server'

startServer();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
