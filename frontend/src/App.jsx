import { useState, useEffect } from 'react';
import './App.css';
import Chatbot from './components/Chatbot';
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import NearbyPolice from './components/NearbyPolice';

function App() {
 const [darkMode, setDarkMode] = useState(false);

 
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) setDarkMode(savedTheme === "dark");
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <>
       <div className={darkMode ? "dark" : ""}>
      <div className="bg-[var(--background)] text-[var(--foreground)]  transition-colors duration-300">
        <div className="max-w-screen mx-auto p-4">
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? "Light Mode" : "Dark Mode"}
            </Button>
         
          </div>
          <Chatbot />
        </div>
      </div>
    </div>
    </>
  );
}

export default App;
