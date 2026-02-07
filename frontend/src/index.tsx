import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App";
import { EthereumProvider } from "./contexts/EthereumContext";
import { BackendProvider } from "./contexts/BackendContext";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <EthereumProvider>
      <BackendProvider>
        <App />
      </BackendProvider>
    </EthereumProvider>
  </React.StrictMode>,
);
