import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { operationsAPI } from '../../api/operations';
import { MessageCircle, Globe, Send, User, Bot, ShieldCheck, Check, Sparkles } from 'lucide-react';
import {
  appPageTitle, appPageDesc, appBtnPrimary, appBtnGhost, appGlassCard,
  appInputPlain, appBadgeActive, appBadgeError, appBadgeInfo,
} from '../../styles/appStyles';

// Custom icons or text tags for channel types:
// Slack: Hash icon
// Telegram: Send (Paperplane)
// Web Chat: Globe
// Internal: MessageCircle

const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    name: "Arthur Dent",
    channel: "Telegram",
    lastMessage: "I need to know the policy regarding planetary displacement travel.",
    time: "4 min ago",
    status: "AI Active", // AI Active, Human Active, Awaiting Hand-off
    avatar: "AD",
    messages: [
      { sender: "user", text: "Hello, is anyone here?" },
      { sender: "ai", text: "Hello Arthur! I'm your AI travel assistant. How can I help you today?" },
      { sender: "user", text: "I need to know the policy regarding planetary displacement travel." }
    ],
    recommendedReply: "Based on our SOPs, interstellar travel and planetary displacement must be cleared by the Galactic Council at least 4 cycles in advance. Would you like me to draft an application form?",
    email: "arthur.dent@galaxy.net",
    company: "Earth Ref. #42"
  },
  {
    id: 2,
    name: "Zaphod Beeblebrox",
    channel: "Slack",
    lastMessage: "Where is my ordered sub-ether radio component? It's late.",
    time: "12 min ago",
    status: "Awaiting Hand-off",
    avatar: "ZB",
    messages: [
      { sender: "user", text: "Listen, I ordered a sub-ether radio two solar days ago." },
      { sender: "ai", text: "Let me check our logistics ledger. One second..." },
      { sender: "user", text: "Where is my ordered sub-ether radio component? It's late." }
    ],
    recommendedReply: "I'm escalating Zaphod to a human dispatcher as he is requesting custom shipment logistics that are not defined in our standard databases.",
    email: "president@galaxy.gov",
    company: "Betelgeuse V"
  },
  {
    id: 3,
    name: "Ford Prefect",
    channel: "Website Chat",
    lastMessage: "The reimbursement policy says my expenses are covered. Can you confirm?",
    time: "1 hour ago",
    status: "Human Active",
    avatar: "FP",
    messages: [
      { sender: "user", text: "Confirming if travel writeups for the Hitchhiker's Guide are eligible for expense reimbursement?" },
      { sender: "ai", text: "According to hospitalities handbook, editorial expenses are covered." },
      { sender: "user", text: "The reimbursement policy says my expenses are covered. Can you confirm?" }
    ],
    recommendedReply: "Yes, Ford, your travel writing expenses are eligible. I've sent the details to our accounting department.",
    email: "ford.prefect@guide.com",
    company: "Megadodo Publications"
  }
];

export default function OmnichannelPage() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeConv, setActiveConv] = useState(INITIAL_CONVERSATIONS[0]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    operationsAPI.list('omnichannel').then(({ data }) => {
      if (!data.length) return;
      const loaded = data.map(item => ({ id: item.id, name: item.title, status: item.status, ...item.data }));
      setConversations(loaded);
      setActiveConv(loaded[0]);
    }).catch(() => {});
  }, []);

  const channelIcon = (channel) => {
    switch (channel) {
      case "Website Chat": return <Globe className="text-blue-500" size={14} />;
      case "Telegram": return <Send className="text-sky-500" size={14} />;
      case "Slack": return <span className="font-bold text-pink-600 text-xs">#</span>;
      default: return <MessageCircle className="text-[#6A6A60]" size={14} />;
    }
  };

  const handleSelectConv = (conv) => {
    // Find current state
    const current = conversations.find(c => c.id === conv.id);
    setActiveConv(current);
  };

  const handleSendMessage = (text, sender = "human") => {
    if (!text.trim()) return;

    const newMsg = { sender, text };

    // Update active conversation
    const updatedConv = {
      ...activeConv,
      messages: [...activeConv.messages, newMsg],
      lastMessage: text,
      time: "Just now"
    };

    setActiveConv(updatedConv);

    // Update in list
    setConversations(prev => prev.map(c => c.id === activeConv.id ? updatedConv : c));
    operationsAPI.update('omnichannel', activeConv.id, {
      data: { messages: updatedConv.messages, lastMessage: text, time: "Just now" }
    }).catch(() => {});
  };

  const handleApproveReply = () => {
    const text = activeConv.recommendedReply;
    handleSendMessage(text, "ai");
  };

  const handleToggleHandoff = () => {
    const newStatus = activeConv.status === "Human Active" ? "AI Active" : "Human Active";
    const updatedConv = { ...activeConv, status: newStatus };

    setActiveConv(updatedConv);
    setConversations(prev => prev.map(c => c.id === activeConv.id ? updatedConv : c));
    operationsAPI.update('omnichannel', activeConv.id, { status: newStatus }).catch(() => {});
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-6xl mx-auto flex flex-col h-[calc(100vh-120px)] min-w-0 overflow-x-hidden">
        <div className="min-w-0">
          <h1 className={`${appPageTitle} flex items-center gap-2`}>
            <MessageCircle size={32} className="text-[#1A1A14] flex-shrink-0" />
            Omnichannel Communication Center
          </h1>
          <p className={appPageDesc}>Unified inbox connecting Website Chat, Telegram, and Slack. Easily review conversation histories and delegate between AI and human operators.</p>
        </div>

        {/* Omnichannel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 flex-1 min-h-0 min-w-0 overflow-y-auto">
          {/* Inbox List (Left Column) */}
          <div className={`lg:col-span-1 ${appGlassCard} !p-4 flex flex-col h-full overflow-hidden min-w-0`}>
            <h3 className="font-bold text-xs text-[#6A6A60] uppercase tracking-wider mb-3">Unified Inbox</h3>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1 min-w-0">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={`p-3 border rounded-xl cursor-pointer transition flex gap-3 min-w-0 ${
                    activeConv.id === conv.id
                      ? 'border-[#1A1A14]/30 bg-[#1A1A14]/5 ring-1 ring-[#1A1A14]/10'
                      : 'border-[#1A1A14]/10 bg-[#1A1A14]/[0.03] hover:bg-[#1A1A14]/[0.06]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center font-bold text-xs text-[#1A1A14] flex-shrink-0">
                    {conv.avatar}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <h4 className="text-xs font-bold text-[#1A1A14] truncate">{conv.name}</h4>
                      <span className="text-[9px] text-[#6A6A60] flex-shrink-0">{conv.time}</span>
                    </div>
                    <p className="text-[10px] text-[#6A6A60] truncate">{conv.lastMessage}</p>
                    <div className="flex justify-between items-center pt-1 gap-2">
                      <span className="flex items-center gap-1 text-[9px] text-[#1A1A14] font-semibold min-w-0 truncate">
                        {channelIcon(conv.channel)}
                        {conv.channel}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        conv.status === 'AI Active' ? appBadgeActive :
                        conv.status === 'Human Active' ? appBadgeInfo :
                        appBadgeError
                      }`}>
                        {conv.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Window (Center Column) */}
          <div className={`lg:col-span-2 ${appGlassCard} flex flex-col justify-between h-full overflow-hidden min-w-0`}>
            <div className="flex-1 flex flex-col justify-between overflow-hidden min-w-0">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-[#1A1A14]/10 pb-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center font-bold text-xs text-[#1A1A14] flex-shrink-0">
                    {activeConv.avatar}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-[#1A1A14] truncate">{activeConv.name}</h3>
                    <p className="text-[10px] text-[#6A6A60]">Channel: {activeConv.channel}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleToggleHandoff}
                    className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold cursor-pointer transition ${
                      activeConv.status === "Human Active"
                        ? 'bg-blue-100 border-blue-200 text-blue-800'
                        : `${appBtnGhost} !px-2.5 !py-1 !text-[10px] !font-bold`
                    }`}
                  >
                    {activeConv.status === "Human Active" ? 'Human Operator Active' : 'Delegate to Human'}
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 select-text max-h-64 min-w-0">
                {activeConv.messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 min-w-0 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender !== 'user' && (
                      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs ${
                        msg.sender === 'ai' ? 'bg-[#1A1A14]/10 text-[#1A1A14]' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {msg.sender === 'ai' ? <Bot size={14} /> : <User size={14} />}
                      </div>
                    )}
                    <div className={`max-w-[85%] sm:max-w-md p-3 rounded-xl text-xs leading-relaxed min-w-0 ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] rounded-tr-none'
                        : msg.sender === 'ai'
                        ? 'bg-[#1A1A14]/[0.06] text-[#1A1A14] rounded-tl-none border border-[#1A1A14]/10'
                        : 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); setInputText(''); }}
              className="flex flex-col sm:flex-row gap-2 border-t border-[#1A1A14]/10 pt-4 mt-4 min-w-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeConv.status === 'Human Active' ? 'Type human operator response...' : 'Type message (Delegated to AI)...'}
                className={`${appInputPlain} flex-1 min-w-0 !text-xs`}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`${appBtnPrimary} !px-4 !py-2 !text-xs !font-bold flex-shrink-0`}
              >
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* Shared Context & AI Helper (Right Column) */}
          <div className="lg:col-span-1 space-y-4 min-w-0">
            {/* Customer Metadata Card */}
            <div className={`${appGlassCard} !p-4 space-y-3 text-xs min-w-0`}>
              <h3 className="font-bold text-xs text-[#6A6A60] uppercase tracking-wider">Customer Context</h3>
              <div className="space-y-2 text-[#1A1A14]">
                <p className="break-words"><strong>Email:</strong> {activeConv.email}</p>
                <p className="break-words"><strong>Organization:</strong> {activeConv.company}</p>
                <p className={`flex items-center gap-1 text-[10px] ${appBadgeActive} !rounded-xl p-2`}>
                  <ShieldCheck size={12} className="flex-shrink-0" />
                  GDPR Verified Contact
                </p>
              </div>
            </div>

            {/* AI Assistant Recommender */}
            <div className="bg-[#1A1A14]/5 border border-[#1A1A14]/15 rounded-2xl p-4 space-y-3 text-xs min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-[#1A1A14]">
                <Sparkles size={14} />
                AI-Assisted Reply Suggestion
              </div>
              <div className="bg-white/50 border border-[#1A1A14]/10 p-3 rounded-xl leading-relaxed text-[#1A1A14] text-[11px] select-text">
                {activeConv.recommendedReply}
              </div>
              <button
                onClick={handleApproveReply}
                className={`${appBtnPrimary} w-full !text-[10px] !font-bold !py-2`}
              >
                <Check size={12} />
                Approve & Send Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
