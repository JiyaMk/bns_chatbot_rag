import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import NearbyPolice from "./NearbyPolice";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! Please describe your experience regarding the incident.",
    },
  ]);
  const [sessionId, setSessionId] = useState(null);
  const API_BASE = import.meta.env.VITE_API_URL || "";
  const [userInput, setUserInput] = useState("");
  const [showVerdict, setShowVerdict] = useState(false);
  const [verdictText, setVerdictText] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef();
  const [activeNearbyIndex, setActiveNearbyIndex] = useState(null);
  const navigate = useNavigate();
  const [showPolicePanel, setShowPolicePanel] = useState(false);

  // Auto-scroll
  useEffect(() => {
    const viewport = chatRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  // Fetch verdict
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

// 🔥 Parse backend formatted sections
const parseSections = (text) => {
  const blocks = text.split(/\n\s*\n/);

  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim());
      if (!lines[0]?.startsWith("Section")) return null;

      const sectionLine = lines[0];
      const content = {};

      lines.slice(1).forEach((line) => {
        const [key, ...rest] = line.split(":");
        if (rest.length > 0) {
          content[key.trim()] = rest.join(":").trim();
        }
      });

      return {
        section: sectionLine,
        meaning: content["What it means"] || "",
        why_applies: content["Why it applies to you"] || "",
        punishment: content["Punishment"] || "Not specified",
        cognizable: content["Cognizable?"] || "Not specified",
        bailable: content["Bailable?"] || "Not specified",
        triable_by: content["Triable By"] || "Not specified",
        compoundable: content["Compoundable?"] || "Not specified",
      };
    })
    .filter(Boolean);
};

  const handleBotResponse = async (userText) => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, session_id: sessionId }),
      });

      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);

      const botText = data.bot || "";

      setLoading(false);

      if (!botText) {
        setMessages((prev) => [...prev, { sender: "bot", text: "(no reply)" }]);
        return;
      }

      // If none apply message
      if (botText.includes("don't clearly match")) {
        setMessages((prev) => [...prev, { sender: "bot", text: botText }]);
        return;
      }

      const parsedSections = parseSections(botText);

      if (parsedSections.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            type: "sections",
            sections: parsedSections,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { sender: "bot", text: botText }]);
      }
    } catch (err) {
      setLoading(false);
      console.error("API error:", err);

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, cannot reach the server right now.",
        },
      ]);
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
      console.warn("Reset failed", err);
    }

    setMessages([
      {
        sender: "bot",
        text: "Hello! Please describe your experience regarding the incident.",
      },
    ]);
    setUserInput("");
    setShowVerdict(false);
  };

  const renderBadge = (label, color) => (
    <Badge className={`px-2 py-1 rounded text-white ${color}`}>{label}</Badge>
  );

  const getNextStepData = (triable, cognizable, bailable, compoundable) => {
    const t = triable?.toLowerCase() || "";
    const c = cognizable?.toLowerCase() || "";
    const b = bailable?.toLowerCase() || "";
    const comp = compoundable?.toLowerCase() || "";

    let steps = [];
    let links = [];

    const isCognizable = c.includes("cognizable") && !c.includes("non");
    const isSessions = t.includes("sessions");
    const isHighCourt = t.includes("high court");
    const isNonBailable = b.includes("non");
    const isCompoundable = comp.includes("yes");

    let policeRequired = false;

    // 🔵 HIGH COURT (No police)
    if (isHighCourt) {
      steps = [
        "Consult a senior advocate.",
        "File an appeal or revision petition.",
        "Prepare certified copies of previous court orders.",
      ];
      return { steps, links, policeRequired };
    }

    // 🔴 SESSIONS COURT (Serious crime → Police required)
    if (isSessions) {
      policeRequired = true;

      steps.push("File FIR immediately at nearest police station.");
      steps.push("Hire a criminal defense lawyer.");

      if (isNonBailable) {
        steps.push("Apply for bail urgently (Non-Bailable offence).");
      } else {
        steps.push("Apply for bail if required.");
      }

      links.push({
        label: "Digital Police Portal",
        url: "https://digitalpolice.gov.in",
      });

      return { steps, links, policeRequired };
    }

    // 🟠 COGNIZABLE (Police required)
    if (isCognizable) {
      policeRequired = true;

      steps.push("File an FIR at nearest police station.");
      steps.push("Preserve all evidence and documents.");
      steps.push("Emergency: Dial 112");

      if (isCompoundable) {
        steps.push("Settlement possible with court approval.");
      }

      links.push({
        label: "Online FIR Portal",
        url: "https://digitalpolice.gov.in",
      });

      return { steps, links, policeRequired };
    }

    // 🟢 NON-COGNIZABLE (No police immediately)
    steps.push("File a private complaint before the Magistrate.");
    steps.push("Police investigation requires Magistrate approval.");

    if (isCompoundable) {
      steps.push("Try mediation or settlement.");
    } else {
      steps.push("Consult a legal professional for guidance.");
    }

    return { steps, links, policeRequired };
  };

  return (
  <div className="flex justify-center w-full h-[85vh] relative ">

    {/* ================= CHAT SECTION ================= */}
    <div
      className={`transition-all duration-300 ${
        showPolicePanel ? "w-[70%]" : "w-[85%]"
      }`}
    >
      <div className="flex flex-col h-[85vh] p-2 max-w-5xl mx-auto border rounded-2xl shadow-lg  ">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Nirnay Bot
        </h1>

        <ScrollArea
          ref={chatRef}
          className="flex-1 px-4 py-6 overflow-y-auto"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-3 flex"
              >
                {/* USER MESSAGE */}
                {msg.sender === "user" && (
                  <div className="ml-auto bg-blue-500 text-white p-3 rounded-2xl max-w-[70%]">
                    {msg.text}
                  </div>
                )}

                {/* BOT NORMAL MESSAGE */}
                {msg.sender === "bot" && !msg.type && (
                  <div className="mr-auto bg-gray-200  text-black  p-3 rounded-2xl max-w-[75%]">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )}

                {/* BOT SECTION CARDS */}
                {msg.sender === "bot" && msg.type === "sections" && (
                  <div className="mr-auto flex flex-col gap-3 max-w-[70%] text-black">
                    {msg.sections.map((s, i) => (
                      <div
                        key={i}
                        className="p-4 bg-gray-100  rounded-xl border"
                      >
                        <h3 className="font-bold text-sm">
                          {s.section}
                        </h3>

                        {/* BADGES */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {renderBadge(s.bailable, "bg-green-700")}
                          {renderBadge(s.cognizable, "bg-purple-700")}
                        </div>

                        <p className="text-sm mt-2">
                          <strong>Punishment:</strong> {s.punishment}
                        </p>

                        <p className="text-sm">
                          <strong>Triable By:</strong> {s.triable_by}
                        </p>

                        {/* NEXT STEPS */}
                        {(() => {
                          const { steps, links, policeRequired } =
                            getNextStepData(
                              s.triable_by,
                              s.cognizable,
                              s.bailable,
                              s.compoundable
                            );

                          return (
                            <div className="mt-3 p-3 bg-blue-50  border  rounded text-sm">
                              <strong>Next Steps:</strong>

                              <ul className="list-disc ml-5 mt-2 space-y-1">
                                {steps.map((step, idx) => (
                                  <li key={idx}>{step}</li>
                                ))}
                              </ul>

                              {/* LINKS */}
                              <div className="flex flex-wrap gap-2 mt-3">
                                {links.map((link, idx) => (
                                  <a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button
                                      size="sm"
                                      variant="outline"
                                    >
                                      {link.label}
                                    </Button>
                                  </a>
                                ))}
                              </div>

                              {/* POLICE PANEL BUTTON */}
                              {policeRequired && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="mt-3"
                                  onClick={() =>
                                    setShowPolicePanel(true)
                                  }
                                >
                                  📍 View Nearby Police Stations
                                </Button>
                              )}
                            </div>
                          );
                        })()}

                        {/* WHAT IT MEANS */}
                        {s.meaning && (
                          <div className="mt-3 p-3 bg-gray-50  border rounded text-sm">
                            <strong>What it means:</strong>
                            <p className="mt-1">{s.meaning}</p>
                          </div>
                        )}

                        {/* WHY IT APPLIES */}
                        {s.why_applies && (
                          <div className="mt-3 p-3 bg-purple-50  border border-purple-200 rounded text-sm">
                            <strong className="text-purple-700 ">
                              Why this applies to your situation:
                            </strong>
                            <p className="mt-1">
                              {s.why_applies}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* LOADING */}
          {loading && (
            <div className="mr-auto bg-gray-200  p-3 rounded-xl max-w-[70%] text-black ">
              analyzing...
            </div>
          )}
        </ScrollArea>

        {/* INPUT SECTION */}
        <div className="flex gap-2 mb-4">
          <textarea
            className="flex-1 p-2 rounded border"
            placeholder="Type your experience..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend}>Send</Button>
        </div>

        {/* RESET + VERDICT */}
        <div className="flex justify-between">
          <Button onClick={handleReset} variant="destructive">
            Reset
          </Button>

          <Dialog open={showVerdict} onOpenChange={setShowVerdict}>
            <DialogTrigger asChild>
              <Button>Verdict</Button>
            </DialogTrigger>

            <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Verdict Sections</DialogTitle>
              </DialogHeader>

              <div className="mt-4 overflow-y-auto max-h-[75vh]">
                {verdictText && (
                  <div className="p-3 bg-gray-100  rounded border text-black ">
                    <ReactMarkdown>
                      {verdictText}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setShowVerdict(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

    {/* ================= RIGHT POLICE PANEL ================= */}
    <AnimatePresence>
      {showPolicePanel && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-[20%] h-[85vh] ml-4 border rounded-2xl shadow-lg bg-gray-50  p-4 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-4 text-black ">
            <h2 className="font-semibold text-sm text-black ">
              Nearby Police Stations
            </h2>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPolicePanel(false)}
            >
              ✕
            </Button>
          </div>

          <div className="text-sm text-black">
            <NearbyPolice />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);}