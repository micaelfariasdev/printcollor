import './index.css';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './routes/Router';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { AlertProvider } from './contexts/AlertContext.tsx';

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <AlertProvider>
      <BrowserRouter>
        <LoadingScreen />
        <AppRouter />
      </BrowserRouter>
    </AlertProvider>
  );
}