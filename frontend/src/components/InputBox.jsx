export default function InputBox({ value, onChange, onSend }) {
  const handleKeyPress = (e) => {
    if (e.key === "Enter") onSend();
  };

  return (
    <div className="flex mt-2 gap-2">
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyPress}
        placeholder="Write your experience..."
        className="flex-1 p-2 rounded border dark:bg-gray-700 dark:text-gray-100"
      />
      <button
        onClick={onSend}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Send
      </button>
    </div>
  );
}
