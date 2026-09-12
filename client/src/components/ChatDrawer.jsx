import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useCart } from '../context/CartContext';
import { aiApi } from '../services/aiApi';
import { 
  MessageSquare, Send, X, ShieldAlert, Sparkles, MapPin, 
  ShoppingBag, ShoppingCart, Info, AlertTriangle, ArrowRight, Loader2
} from 'lucide-react';

export default function ChatDrawer({ 
  activeUserId, 
  activeUserName, 
  chatPartnerId = null, 
  chatPartnerName = null, 
  onClose 
}) {
  const socket = useSocket();
  const { addToCart } = useCart();
  const [messages, setMessages] = useState([
    {
      senderId: 'ai',
      senderName: 'MediFind AI',
      message: 'Hello! I am your MediFind Clinical & Pharmacy Discovery Assistant. Ask me to find medicines near you, explain uses, compare prices, or recommend verified pharmacies.',
      timestamp: new Date().toISOString(),
      isAi: true
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const isDirectPeerChat = Boolean(chatPartnerId && chatPartnerId !== 'ai');

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiLoading]);

  // Setup socket listener for direct peer messages
  useEffect(() => {
    if (!socket || !isDirectPeerChat) return;

    const handleReceiveMessage = (data) => {
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
  }, [socket, chatPartnerId, activeUserId, isDirectPeerChat]);

  const handleSend = async (customText = null) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    const userMsg = {
      senderId: activeUserId || 'user',
      senderName: activeUserName || 'You',
      receiverId: chatPartnerId || 'ai',
      message: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    if (isDirectPeerChat) {
      if (socket) {
        socket.emit('send_message', userMsg);
      }
      return;
    }

    // AI Assistant Mode
    try {
      setIsAiLoading(true);
      const res = await aiApi.chat(textToSend);
      if (res.success) {
        setMessages(prev => [
          ...prev,
          {
            senderId: 'ai',
            senderName: 'MediFind AI',
            message: res.aiResponse || 'Here is the matching medicine and pharmacy inventory.',
            medicineInfo: res.medicineInfo,
            matchedMedicines: res.data || [],
            timestamp: new Date().toISOString(),
            isAi: true
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            senderId: 'ai',
            senderName: 'MediFind AI',
            message: res.message || 'I encountered an issue processing your query. Please try searching with a medicine name or symptom.',
            timestamp: new Date().toISOString(),
            isAi: true
          }
        ]);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          senderId: 'ai',
          senderName: 'MediFind AI',
          message: 'Unable to reach clinical AI service at the moment. Please verify server connection.',
          timestamp: new Date().toISOString(),
          isAi: true
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const samplePrompts = [
    'I need something commonly used for acidity.',
    'Find paracetamol near me',
    'Show me the cheapest available option',
    'What is Cetirizine generally used for?'
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 w-84 sm:w-96 h-[520px] bg-white rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
      {/* Drawer Title Bar (Pine Green) */}
      <div className="bg-brand-500 text-white p-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            {isDirectPeerChat ? (
              <MessageSquare className="w-4.5 h-4.5 text-white" />
            ) : (
              <Sparkles className="w-4.5 h-4.5 text-emerald-300 animate-pulse" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-xs leading-none">
              {isDirectPeerChat ? (chatPartnerName || 'Direct Support') : 'MediFind AI Assistant'}
            </h4>
            <span className="text-[9px] text-brand-100 mt-0.5 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {isDirectPeerChat ? 'Direct Operational Channel' : 'Clinical & Inventory Discovery'}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-amber-50/80 border-b border-amber-100 px-3 py-2 flex items-start gap-2 shrink-0">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[9px] text-amber-800 leading-tight">
          Educational guidance only. For medical emergencies or prescriptions, always consult a licensed doctor or pharmacist.
        </p>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 p-3.5 overflow-y-auto bg-slate-50 flex flex-col gap-3">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === (activeUserId || 'user');
          return (
            <div 
              key={index} 
              className={`flex flex-col max-w-[88%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                isMe 
                  ? 'bg-brand-500 text-white rounded-br-none shadow-sm' 
                  : 'bg-white text-slate-800 border border-slate-200/70 rounded-bl-none shadow-xs'
              }`}>
                {/* Text Content */}
                <div className="whitespace-pre-line">{msg.message}</div>

                {/* Grounded Drug Monograph Card */}
                {msg.medicineInfo && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 bg-slate-50/70 rounded-xl p-2.5 text-[11px] text-slate-700 flex flex-col gap-1.5">
                    <div className="font-bold text-brand-700 flex items-center gap-1 text-[11px]">
                      <Info className="w-3.5 h-3.5" />
                      {msg.medicineInfo.name}
                    </div>
                    {msg.medicineInfo.commonUses && (
                      <p className="text-[10px] text-slate-600">
                        <span className="font-semibold text-slate-800">Primary Uses:</span> {msg.medicineInfo.commonUses.join(', ')}
                      </p>
                    )}
                    {msg.medicineInfo.dosageForms && (
                      <p className="text-[10px] text-slate-600">
                        <span className="font-semibold text-slate-800">Dosage Forms:</span> {msg.medicineInfo.dosageForms.join(' • ')}
                      </p>
                    )}
                    {msg.medicineInfo.commonPrecautions && msg.medicineInfo.commonPrecautions[0] && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 font-medium">
                        ⚠️ {msg.medicineInfo.commonPrecautions[0]}
                      </p>
                    )}
                    {msg.medicineInfo.disclaimer && (
                      <p className="text-[9px] text-slate-400 italic mt-0.5">
                        {msg.medicineInfo.disclaimer}
                      </p>
                    )}
                  </div>
                )}

                {/* Grounded Live Inventory Matches */}
                {msg.matchedMedicines && msg.matchedMedicines.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Available at verified pharmacies:
                    </span>
                    {msg.matchedMedicines.slice(0, 3).map((item, mIdx) => (
                      <div 
                        key={item._id || mIdx}
                        className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate text-[11px]">{item.name}</span>
                          <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            {item.pharmacy?.shopName || 'Partner Pharmacy'} ({item.pharmacy?.distance ?? 0} km)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono-plex font-bold text-xs text-brand-600">₹{item.price}</span>
                          <button
                            onClick={() => {
                              addToCart(item, item.pharmacy || {});
                            }}
                            className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            title="Add to cart"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[8px] text-slate-400 mt-1 font-mono-plex px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isAiLoading && (
          <div className="self-start flex items-center gap-2 p-3 bg-white border border-slate-200/60 rounded-2xl rounded-bl-none text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span>Consulting pharmacology index & pharmacy stocks...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips (only shown if not in direct peer chat) */}
      {!isDirectPeerChat && (
        <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {samplePrompts.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSend(prompt)}
              className="text-[10px] text-slate-600 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-all border border-slate-200/60 shrink-0 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2 items-center bg-white shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isDirectPeerChat ? "Type message to pharmacy..." : "Ask MediFind AI (e.g. 'acidity medicine near me')..."}
          className="flex-1 text-xs border rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400 bg-slate-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isAiLoading}
          className="w-10 h-10 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
