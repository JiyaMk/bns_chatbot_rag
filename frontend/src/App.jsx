import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Chatbot from "./components/Chatbot";
import NearbyPolice from "./components/NearbyPolice";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

function App() {
  
  return (
    
      <div className="bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 min-h-screen">
        <div className="max-w-screen mx-auto p-4">
          

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