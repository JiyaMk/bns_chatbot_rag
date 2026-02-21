import { motion } from "framer-motion";

export default function ChatMessage({ sender, text }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: sender === "bot" ? -50 : 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-2 rounded max-w-xs break-words ${
        sender === "bot" ? "bg-blue-100 text-gray-900 self-start" : "bg-green-200 text-gray-900 self-end ml-auto"
      }`}
    >
      {text}
    </motion.div>
  );
}
