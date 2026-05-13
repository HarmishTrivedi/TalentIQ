import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Smile } from 'lucide-react';
import { useAuthStore } from '../../store';

export default function MeetingChat({ interviewId, onClose }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      sender: user?.full_name || 'You',
      text: newMessage,
      timestamp: new Date(),
      isOwn: true
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-black/60 backdrop-blur-xl border-l border-purple-500/20 flex flex-col z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
        <h3 className="text-white font-bold">Chat</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-purple-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-purple-300/50 text-sm">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.isOwn
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-purple-500/20 text-purple-100'
                }`}
              >
                {!msg.isOwn && (
                  <p className="text-xs opacity-70 mb-1">{msg.sender}</p>
                )}
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs opacity-60 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-purple-500/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
