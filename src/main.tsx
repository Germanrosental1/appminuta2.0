import React from 'react'
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initRouterConfig } from './utils/router-config';

// Inicializar la configuración del router
initRouterConfig();

createRoot(document.getElementById("root")!).render(<App />);
