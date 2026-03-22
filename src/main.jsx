import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css';
import App from './App.jsx';

console.log('%c🚀 CASCADE LOG BOOTING...', 'color: #ff007f; font-weight: bold; font-size: 20px;');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
