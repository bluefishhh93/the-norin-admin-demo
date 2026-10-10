import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import './styles.css';
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
