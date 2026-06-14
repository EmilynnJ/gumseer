import React from "react"; import ReactDOM from "react-dom/client"; import { BrowserRouter } from "react-router-dom"; import { Auth0Provider } from "@auth0/auth0-react"; import { AuthProvider } from "./contexts/AuthContext"; import { BalanceProvider } from "./contexts/BalanceContext"; import { ToastProvider } from "./components/Toast"; import App from "./App"; import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0Provider domain={import.meta.env.VITE_AUTH0_DOMAIN} clientId={import.meta.env.VITE_AUTH0_CLIENT_ID} authorizationParams={{ redirect_uri: window.location.origin, audience: import.meta.env.VITE_AUTH0_AUDIENCE }} cacheLocation="localstorage">
        <AuthProvider>
          <BalanceProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </BalanceProvider>
        </AuthProvider>
      </Auth0Provider>
    </BrowserRouter>
  </React.StrictMode>
);
