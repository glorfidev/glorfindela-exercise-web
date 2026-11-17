import React, { type ComponentType, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import './styles/index.css';

function render(SessionProvider: ComponentType<{ children: ReactNode }>) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <SessionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SessionProvider>
    </React.StrictMode>,
  );
}

if (import.meta.env.MODE === 'demo') {
  // `npm run dev:demo`: mock backend and session, no Keycloak or API server needed.
  // Imported lazily so regular builds never include the demo code.
  void import('./demo').then(({ startDemoMode }) => {
    const demo = startDemoMode();
    render(demo.SessionProvider);
  });
} else {
  render(AuthProvider);
}
