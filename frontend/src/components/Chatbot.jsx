import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! Please describe your experience regarding the incident." }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const API_BASE = import.meta.env.VITE_API_URL || "";
  const [userInput, setUserInput] = useState("");
  const [showVerdict, setShowVerdict] = useState(false);
  const [verdictText, setVerdictText] = useState(null);
  const [sections, setSections] = useState([]);
  const chatRef = useRef();

  // Auto-scroll
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showVerdict || !sessionId) {
      setVerdictText(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/verdict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        if (data.verdict) setVerdictText(data.verdict);
      } catch (err) {
        console.warn("Verdict fetch failed", err);
      }
    })();
  }, [showVerdict, sessionId]);

  const handleBotResponse = async (userText) => {
    try {
      const res = await fetch(`${API_BASE}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, session_id: sessionId }),
      });
      const data = await res.json();

      if (data.session_id) setSessionId(data.session_id);

      if (data.response && data.response.candidates && data.response.candidates.length > 0) {
        const parsedSections = data.response.candidates.map((c) => ({
          section: c.section || c.title || "Unknown Section",
          title: c.title || "",
          description: c.description || "",
          bailable:
            c.bailable === true || String(c.bailable).toLowerCase() === "true" || String(c.bailable).toLowerCase() === "bailable"
              ? "Bailable"
              : "Non-bailable",
          cognizable:
            c.cognizable === true || String(c.cognizable).toLowerCase() === "true" || String(c.cognizable).toLowerCase() === "cognizable"
              ? "Cognizable"
              : "Non-cognizable",
          punishment: c.punishment || "—",
          score: c.score ? (c.score * 100).toFixed(1) + "%" : null,
        }));

        setSections(parsedSections);

        setMessages((prev) => [
          ...prev,
          { sender: "bot", type: "sections", sections: parsedSections },
        ]);
      } else {
        const botText = data.bot || "(no reply)";
        setMessages((prev) => [...prev, { sender: "bot", text: botText }]);
      }
    } catch (err) {
      console.error("API error:", err);
      setMessages((prev) => [...prev, { sender: "bot", text: "Sorry — cannot reach the server right now." }]);
    }
  };

  const handleSend = () => {
    if (!userInput.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text: userInput }]);
    const text = userInput;
    setUserInput("");
    handleBotResponse(text);
  };

  const handleReset = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);
    } catch (err) {
      console.warn("Reset request failed", err);
    }

    setMessages([{ sender: "bot", text: "Hello! Please describe your experience regarding the incident." }]);
    setUserInput("");
    setSections([]);
    setShowVerdict(false);
  };

  // Badge helpers
  const renderBailableBadge = (bailable) => {
    const isBailable = String(bailable).toLowerCase() === "bailable";
    return (
      <Badge className={`px-2 py-1 rounded ${isBailable ? "bg-green-800 text-white" : "bg-red-800 text-white"}`}>
        {bailable}
      </Badge>
    );
  };

  const renderCognizableBadge = (cognizable) => {
    const isCognizable = String(cognizable).toLowerCase() === "cognizable";
    return (
      <Badge className={`px-2 py-1 rounded ${isCognizable ? "bg-purple-600 text-white" : "bg-yellow-600 text-black"}`}>
        {cognizable}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-[90vh] max-w-[60vw] mx-auto p-4 bg-[var(--background)] text-[var(--foreground)] rounded-xl shadow-lg border border-[var(--border)]">
      <h1 className="text-2xl font-bold mb-4 text-center">Nirnay Bot</h1>

      <ScrollArea ref={chatRef} className="flex-1 mb-4 p-2 bg-[var(--card)] overflow-y-auto rounded">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="mb-2 flex"
            >
              {/* User message */}
              {msg.sender === "user" && (
                <div className="ml-auto bg-blue-500 text-white p-2 rounded-xl max-w-[70%] break-words">
                  {msg.text}
                </div>
              )}

              {/* Bot normal text */}
              {msg.sender === "bot" && !msg.type && (
                <div className="mr-auto bg-gray-200 dark:bg-gray-300 text-gray-800 p-2 rounded-xl max-w-[70%] break-words [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_h3]:font-bold [&_h3]:mt-2">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}

              {/* Bot legal sections */}
              {msg.sender === "bot" && msg.type === "sections" && (
             <div className="mr-auto flex flex-col space-y-3">
  {msg.sections.map((s, sIdx) => (
    <div
      key={sIdx}
      className="p-3 bg-gray-100 dark:bg-gray-200 text-gray-900 rounded-xl max-w-[70%] border border-gray-300 break-words"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-sm">{s.section}</h3>
        {s.score && <span className="text-xs font-semibold text-gray-700">Confidence: {s.score}</span>}
      </div>

      {s.title && <p className="text-xs opacity-70">{s.title}</p>}

      {/* Badges container */}
      <div className="flex flex-wrap gap-2 mt-2">
        {renderBailableBadge(s.bailable)}
        {renderCognizableBadge(s.cognizable)}
        {/* Punishment badge: wrap long text */}
        <Badge className="px-2 py-1 border border-gray-600  rounded break-words max-w-full whitespace-normal">
          {s.punishment}
        </Badge>
      </div>

      {s.description && <p className="text-sm mt-2 opacity-80 break-words">{s.description}</p>}
    </div>
  ))}
</div>

              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <textarea
          className="flex-1 p-2 rounded border border-gray-300"
          placeholder="Type your experience..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <Button onClick={handleSend}>Send</Button>
      </div>

      <div className="flex justify-between gap-2">
        <Button onClick={handleReset} variant="destructive">Reset</Button>

        <Dialog open={showVerdict} onOpenChange={setShowVerdict}>
  <DialogTrigger asChild>
    <Button>Verdict</Button>
  </DialogTrigger>

  <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] border border-[var(--border)] bg-[var(--card)] rounded-xl p-4 overflow-hidden">
    <DialogHeader>
      <DialogTitle>Verdict Sections</DialogTitle>
    </DialogHeader>

    {/* Scrollable content */}
    <div className="mt-4 space-y-4 overflow-y-auto max-h-[75vh] pr-2">
      {verdictText && (
        <div className="p-3 mb-3 bg-[var(--input)] rounded border break-words [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_h3]:font-bold [&_h3]:mt-2">
          <ReactMarkdown>{verdictText}</ReactMarkdown>
        </div>
      )}

    </div>
       
     

    <DialogFooter>
      <Button onClick={() => setShowVerdict(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      </div>
    </div>
  );
}
