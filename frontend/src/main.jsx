// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Fuente profesional y estilos globales suaves
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <div className="font-inter bg-gray-50 min-h-screen text-gray-800">
      <App />
    </div>
  </React.StrictMode>
);
