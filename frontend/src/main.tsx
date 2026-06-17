
import './styles/index.css';  // o './styles/index.css' según la ruta
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";

createRoot(document.getElementById("root")!).render(<App />);