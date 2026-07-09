import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, Send, X, ShieldAlert } from 'lucide-react';

export default function ChatDrawer({ 
  activeUserId, 
  activeUserName, 
  chatPartnerId, 
  chatPartnerName, 
  onClose 
}) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup socket listener for incoming chat messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      // Only append if the message is from our current conversation partner
      if (
        (data.senderId === chatPartnerId && data.receiverId === activeUserId) ||
        (data.senderId === activeUserId && data.receiverId === chatPartnerId)
      ) {
        setMessages((prev) => [...prev, data]);
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, chatPartnerId, activeUserId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    const messageData = {
      senderId: activeUserId,
      senderName: activeUserName,
      receiverId: chatPartnerId,
      message: inputText,
      timestamp: new Date().toISOString()
    };

    // Emit socket event to backend room broadcast
    socket.emit('send_message', messageData);
    setInputText('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 h-[450px] bg-white rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
      {/* Drawer Title Bar (Pine Green) */}
      <div className="bg-brand-500 text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <div>
            <h4 className="font-bold text-xs leading-none">{chatPartnerName || 'Support Representative'}</h4>
            <span className="text-[9px] text-brand-100 mt-0.5 block">Direct Operational Chat</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Warning banner about emergency protocols */}
      <div className="bg-amber-50 border-b border-amber-100 p-2 px-3 flex items-start gap-1.5 shrink-0">
        <ShieldAlert className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0" />
        <p className="text-[9px] text-accent-700 leading-normal">
          For critical status questions or safety guidelines, discuss pickup delays directly here.
        </p>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-2.5">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <span className="text-2xl mb-1">💬</span>
            <p className="text-[10px] text-slate-400 font-medium">No messages yet. Send a message to start conversation.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === activeUserId;
            return (
              <div 
                key={index} 
                className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  isMe 
                    ? 'bg-brand-500 text-white rounded-br-none' 
                    : 'bg-white text-slate-800 border border-slate-200/50 rounded-bl-none'
                }`}>
                  {msg.message}
                </div>
                <span className="text-[8px] text-slate-400 mt-1 font-mono-plex">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2 items-center bg-white shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message details..."
          className="flex-1 text-xs border rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400 bg-slate-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
