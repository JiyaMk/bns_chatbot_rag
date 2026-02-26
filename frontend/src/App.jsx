import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Chatbot from "./components/Chatbot";
import NearbyPolice from "./components/NearbyPolice";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

function App() {
  const [darkMode, setDarkMode] = useState(false);

  // Load saved theme
  useEffect(() => {
  const root = document.documentElement;

  if (darkMode) {
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}, [darkMode]);

  // Save theme
  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    
      <div className="bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 min-h-screen">
        <div className="max-w-screen mx-auto p-4">
          
          {/* Dark Mode Toggle */}
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>

          {/* ROUTES GO HERE */}
          <Routes>
            <Route path="/" element={<Chatbot />} />
            <Route path="/nearby-police" element={<NearbyPolice />} />
          </Routes>

        </div>
      </div>
   
  );
}

export default App;