import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import './styles.css';
import './layout/layout.css';
import './pages/dashboard.css';
import './pages/business/business.css';
import './pages/system/system.css';
import './pages/rooms/rooms.css';
import './pages/rooms/content-editor.css';
import './pages/branches/branches.css';
import App from './App';
import { StoreProvider } from './store';
import { ModalHost } from './components/ModalHost';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ModalHost>
        <App />
      </ModalHost>
    </StoreProvider>
  </StrictMode>
);
