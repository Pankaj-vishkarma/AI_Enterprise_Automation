import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { MessageCircle, Globe, Send, User, Bot, AlertTriangle, ShieldCheck, Check, Sparkles, Sliders } from 'lucide-react';

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

  const channelIcon = (channel) => {
    switch (channel) {
      case "Website Chat": return <Globe className="text-blue-500" size={14} />;
      case "Telegram": return <Send className="text-sky-500" size={14} />;
      case "Slack": return <span className="font-bold text-pink-600 text-xs">#</span>;
      default: return <MessageCircle className="text-gray-500" size={14} />;
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
  };

  const simulateIncomingReply = () => {
    const responses = [
      "Wait, that doesn't answer my question. Can I speak to a manager?",
      "Perfect, thank you! That is exactly what I was looking for.",
      "Are there any hidden service charges for that?",
      "Let me review this policy and get back to you shortly."
    ];
    const randomReply = responses[Math.floor(Math.random() * responses.length)];
    handleSendMessage(randomReply, "user");
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-6xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle size={32} className="text-primary" />
            Omnichannel Communication Center
          </h1>
          <p className="text-muted-foreground mt-1">Unified inbox connecting Website Chat, Telegram, and Slack. Easily review conversation histories and delegate between AI and human operators.</p>
        </div>

        {/* Omnichannel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 overflow-y-auto">
          {/* Inbox List (Left Column) */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl p-4 flex flex-col h-full overflow-hidden shadow-sm">
            <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3">Unified Inbox</h3>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={`p-3 border rounded-xl cursor-pointer transition flex gap-3 ${
                    activeConv.id === conv.id ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20 hover:bg-secondary/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-xs text-foreground flex-shrink-0">
                    {conv.avatar}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-foreground truncate">{conv.name}</h4>
                      <span className="text-[9px] text-muted-foreground">{conv.time}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{conv.lastMessage}</p>
                    <div className="flex justify-between items-center pt-1">
                      <span className="flex items-center gap-1 text-[9px] text-foreground font-semibold">
                        {channelIcon(conv.channel)}
                        {conv.channel}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        conv.status === 'AI Active' ? 'bg-green-100 text-green-800' :
                        conv.status === 'Human Active' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
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
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col justify-between h-full overflow-hidden shadow-sm">
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-xs text-foreground">
                    {activeConv.avatar}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">{activeConv.name}</h3>
                    <p className="text-[10px] text-muted-foreground">Channel: {activeConv.channel}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleToggleHandoff}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                      activeConv.status === "Human Active" 
                        ? 'bg-blue-100 border-blue-200 text-blue-800' 
                        : 'bg-secondary border-border text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {activeConv.status === "Human Active" ? 'Human Operator Active' : 'Delegate to Human'}
                  </button>
                  <button 
                    onClick={simulateIncomingReply}
                    className="px-2.5 py-1 bg-secondary border border-border hover:bg-secondary/80 text-foreground rounded-lg text-[10px] font-bold cursor-pointer transition"
                  >
                    Simulate Client Reply
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 select-text scrollbar-thin max-h-64">
                {activeConv.messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender !== 'user' && (
                      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs ${
                        msg.sender === 'ai' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {msg.sender === 'ai' ? <Bot size={14} /> : <User size={14} />}
                      </div>
                    )}
                    <div className={`max-w-md p-3 rounded-lg text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : msg.sender === 'ai'
                        ? 'bg-secondary text-secondary-foreground rounded-tl-none border border-border'
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
              className="flex gap-2 border-t border-border pt-4 mt-4"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeConv.status === 'Human Active' ? 'Type human operator response...' : 'Type message (Delegated to AI)...'}
                className="flex-1 px-4 py-2 border border-border rounded-xl bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer font-bold text-xs"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* Shared Context & AI Helper (Right Column) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Customer Metadata Card */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm text-xs">
              <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Customer Context</h3>
              <div className="space-y-2 text-foreground">
                <p><strong>Email:</strong> {activeConv.email}</p>
                <p><strong>Organization:</strong> {activeConv.company}</p>
                <p className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 border border-green-200 p-2 rounded">
                  <ShieldCheck size={12} className="flex-shrink-0" />
                  GDPR Verified Contact
                </p>
              </div>
            </div>

            {/* AI Assistant Recommender */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 shadow-sm text-xs">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <Sparkles size={14} />
                AI-Assisted Reply Suggestion
              </div>
              <div className="bg-input border border-border p-3 rounded-lg leading-relaxed text-foreground text-[11px] select-text">
                {activeConv.recommendedReply}
              </div>
              <button
                onClick={handleApproveReply}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-bold py-2 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 shadow-sm"
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
