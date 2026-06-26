import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { StoreProvider } from './context/StoreContext'
import { ProductsProvider } from './context/ProductsContext'
import { AuthModalProvider } from './context/AuthModalContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <ProductsProvider>
          <AuthModalProvider>
            <App />
          </AuthModalProvider>
        </ProductsProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
