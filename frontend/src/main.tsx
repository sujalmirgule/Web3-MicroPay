import React from "react";
import ReactDOM from "react-dom/client";
import { WalletProvider } from "./context/WalletContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import App from "./App";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find root DOM element with id 'root'.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <NotificationProvider>
      <WalletProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </WalletProvider>
    </NotificationProvider>
  </React.StrictMode>
);
