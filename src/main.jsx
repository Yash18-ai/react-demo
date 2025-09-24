import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { store, persistor } from './app/store.jsx'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/css/theme.css';
import { ThemeProvider } from './context/ThemeContext.jsx'


createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <Provider store={store}>
      <PersistGate loading={<p>Loading...</p>} persistor={persistor}>
        <ThemeProvider>
            <App />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  // </StrictMode>
)
