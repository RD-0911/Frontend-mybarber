import { createRoot } from 'react-dom/client'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'
import App from './App.jsx'
import { inicializarCsrf } from './utils/api.js'

//Advertencia de ataques Self-XSS
console.log(
  '%cADVERTENCIA: No copies ni ejecutes código desconocido en ésta consola, podría poner en peligro la seguridad de tu cuenta. ',
  'color: #ffcc00; font-size: 16px; font-weight: bold; background: #1a1a1a; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #ff4444;'
)

inicializarCsrf();

createRoot(document.getElementById('root')).render(
  <App />
)