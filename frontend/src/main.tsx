import React from 'react'
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Enable dark mode by default like visualescalcu
document.documentElement.classList.add('dark');
document.documentElement.lang = 'es';

const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(<App />);
}
