import { AuthProvider } from './auth/AuthContext'
import { AppRouter } from './routes/AppRouter'
import { ThemeProvider } from './theme/ThemeContext'
import { AppToastContainer } from './components/feedback/AppToastContainer'
import 'react-toastify/dist/ReactToastify.css'

function App() {
  return <ThemeProvider><AppToastContainer /><AuthProvider><AppRouter /></AuthProvider></ThemeProvider>
}

export default App
