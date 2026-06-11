import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { LifeBuoy, Plus, Sparkles, MessageCircle, AlertTriangle, ArrowRight, X, Heart, Meh, Frown, CheckCircle } from 'lucide-react';

const INITIAL_TICKETS = [
  {
    id: "TCK-1024",
    title: "Subscription charge failed twice",
    customer: "clara.jones@example.com",
    category: "Billing Issues",
    sentiment: "Negative", // Negative, Neutral, Positive
    status: "New", // New, In Progress, Resolved
    escalated: false,
    message: "I tried updating my credit card details, but my bank statement shows two pending charges of $49 while the billing dashboard still says 'Payment Failed'. Please fix this and issue a refund.",
    aiRecommendation: "Hello Clara, I apologize for the double billing. I've located the two pending transactions. Our payment gateway had a minor timeout sync issue. I've initiated a void request for the duplicate charge, which will clear in 2 business days. Your account status is now successfully set to 'Active'."
  },
  {
    id: "TCK-1025",
    title: "Cannot authenticate API request",
    customer: "devops-lead@techcorp.com",
    category: "Technical Problems",
    sentiment: "Neutral",
    status: "In Progress",
    escalated: true,
    message: "Our CI/CD pipeline is throwing 401 Unauthorized exceptions when sending payloads to /api/v1/automation endpoint, despite injecting the correct Bearer token in the header. Code snippet attached.",
    aiRecommendation: "Hi there, it looks like you are calling the endpoint under /api/v1/automation, which requires organization-level roles mapping permissions (specifically MANAGE_TEAMS or ORG_ADMIN access tokens). Please verify your token claims contain the appropriate roles scope, or use the tenant-key bypass header."
  },
  {
    id: "TCK-1026",
    title: "Request for multi-agent export feature",
    customer: "product-manager@hubspot.com",
    category: "Feature Requests",
    sentiment: "Positive",
    status: "Resolved",
    escalated: false,
    message: "We love the Multi-Agent Collaboration Studio! It would be incredibly helpful if we could export the final agent timeline dialogue directly as a PDF or formatted Markdown file. Let us know if this is planned.",
    aiRecommendation: "Dear user, thank you for the positive feedback! We are excited to share that exporting reports in Markdown is now fully supported. A PDF download feature is currently in design and will be launched in the next minor version release."
  }
];

export default function SupportPage() {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [category, setCategory] = useState('Billing Issues');
  const [message, setMessage] = useState('');

  const sentimentIcon = (sentiment) => {
    switch (sentiment) {
      case "Positive": return <Heart className="text-green-600 fill-green-100" size={14} />;
      case "Neutral": return <Meh className="text-yellow-600 fill-yellow-100" size={14} />;
      case "Negative": return <Frown className="text-red-600 fill-red-100" size={14} />;
      default: return null;
    }
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!title.trim() || !customer.trim()) return;

    // Detect mock sentiment
    let sentiment = "Neutral";
    if (message.toLowerCase().includes("bad") || message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") || message.toLowerCase().includes("broken")) {
      sentiment = "Negative";
    } else if (message.toLowerCase().includes("love") || message.toLowerCase().includes("great") || message.toLowerCase().includes("help")) {
      sentiment = "Positive";
    }

    const newTicket = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      customer,
      category,
      sentiment,
      status: "New",
      escalated: false,
      message,
      aiRecommendation: `Hello, thank you for reaching out regarding your ${category.toLowerCase()}. Based on your query about "${title}", our AI support agent recommends checking your account configuration settings or looking at our FAQ section. Let us know if you need human escalation.`
    };

    setTickets([...tickets, newTicket]);
    setIsCreateOpen(false);

    // Reset
    setTitle('');
    setCustomer('');
    setCategory('Billing Issues');
    setMessage('');
  };

  const handleMoveStatus = (ticketId, newStatus) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const updated = { ...t, status: newStatus };
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(updated);
        }
        return updated;
      }
      return t;
    }));
  };

  const handleEscalate = (ticketId) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const updated = { ...t, escalated: true };
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(updated);
        }
        return updated;
      }
      return t;
    }));
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-6xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <LifeBuoy size={32} className="text-primary" />
              Customer Support Desk
            </h1>
            <p className="text-muted-foreground mt-1">Manage client tickets, categorize issues, evaluate customer sentiment, and send recommended AI resolutions.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition cursor-pointer font-semibold text-sm"
          >
            <Plus size={18} />
            Create Ticket
          </button>
        </div>

        {/* Kanban Board Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto">
          {["New", "In Progress", "Resolved"].map(colStatus => {
            const colTickets = tickets.filter(t => t.status === colStatus);
            return (
              <div key={colStatus} className="bg-secondary/20 border border-border rounded-xl p-4 flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      colStatus === 'New' ? 'bg-red-500' :
                      colStatus === 'In Progress' ? 'bg-primary' :
                      'bg-green-500'
                    }`} />
                    {colStatus} Tickets
                  </h3>
                  <span className="bg-secondary text-secondary-foreground text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {colTickets.length}
                  </span>
                </div>

                {/* Ticket cards */}
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {colTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`bg-card border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary transition cursor-pointer space-y-3 ${
                        selectedTicket?.id === ticket.id ? 'border-primary ring-1 ring-primary' : 'border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground">{ticket.id}</span>
                        <div className="flex gap-1.5 items-center">
                          {ticket.escalated && (
                            <span className="text-[9px] bg-red-100 text-red-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <AlertTriangle size={8} /> Esc
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            ticket.sentiment === 'Positive' ? 'bg-green-50 text-green-700' :
                            ticket.sentiment === 'Negative' ? 'bg-red-50 text-red-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {sentimentIcon(ticket.sentiment)}
                            {ticket.sentiment}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-relaxed">{ticket.title}</h4>
                      <p className="text-[10px] text-muted-foreground truncate">{ticket.customer}</p>

                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="text-[9px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded">
                          {ticket.category}
                        </span>
                      </div>
                    </div>
                  ))}
                  {colTickets.length === 0 && (
                    <div className="h-32 border border-dashed border-border rounded-xl flex items-center justify-center text-xs text-muted-foreground italic">
                      No tickets in {colStatus.toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ticket Drawer Details (Sidebar Drawer when selected) */}
        {selectedTicket && (
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-[slide-in_0.3s]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-secondary mt-16 md:mt-0">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground">{selectedTicket.id}</span>
                <h3 className="font-bold text-sm text-foreground truncate max-w-[250px]">{selectedTicket.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer info */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Customer Details</p>
                <div className="bg-secondary/40 border border-border p-3 rounded-lg text-xs space-y-1 text-foreground">
                  <p><strong>Email:</strong> {selectedTicket.customer}</p>
                  <p><strong>Category:</strong> {selectedTicket.category}</p>
                  <p className="flex items-center gap-1.5">
                    <strong>Sentiment:</strong> 
                    {sentimentIcon(selectedTicket.sentiment)} 
                    <span>{selectedTicket.sentiment}</span>
                  </p>
                </div>
              </div>

              {/* Message details */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Inquiry Message</p>
                <div className="bg-secondary/20 border border-border p-3 rounded-lg text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text">
                  {selectedTicket.message}
                </div>
              </div>

              {/* AI Recommended Response */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Sparkles size={14} />
                  AI Suggested Response Resolution
                </div>
                <div className="bg-input border border-border p-3 rounded-lg text-xs leading-relaxed text-foreground select-text">
                  {selectedTicket.aiRecommendation}
                </div>
                <div className="flex gap-2 justify-end">
                  {!selectedTicket.escalated && (
                    <button
                      onClick={() => handleEscalate(selectedTicket.id)}
                      className="px-2.5 py-1 bg-secondary text-foreground hover:bg-secondary/80 rounded border border-border text-[10px] font-bold cursor-pointer transition flex items-center gap-0.5"
                    >
                      Escalate to Manager
                    </button>
                  )}
                  {selectedTicket.status !== 'Resolved' && (
                    <button
                      onClick={() => handleMoveStatus(selectedTicket.id, "Resolved")}
                      className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-0.5"
                    >
                      <CheckCircle size={10} /> Send AI Answer
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-secondary flex justify-between">
              <span className="text-xs font-bold text-muted-foreground self-center">Action Board:</span>
              <div className="flex gap-1.5">
                {selectedTicket.status !== 'New' && (
                  <button 
                    onClick={() => handleMoveStatus(selectedTicket.id, "New")}
                    className="px-2 py-1 bg-secondary text-foreground border border-border rounded text-[10px] font-bold cursor-pointer hover:bg-secondary/80"
                  >
                    Move to New
                  </button>
                )}
                {selectedTicket.status !== 'In Progress' && (
                  <button 
                    onClick={() => handleMoveStatus(selectedTicket.id, "In Progress")}
                    className="px-2 py-1 bg-secondary text-foreground border border-border rounded text-[10px] font-bold cursor-pointer hover:bg-secondary/80"
                  >
                    Mark Active
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Ticket Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-secondary">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <MessageCircle size={20} className="text-primary" />
                  Create Ticket
                </h2>
                <button 
                  onClick={() => setIsCreateOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Ticket Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Received incorrect item invoice"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Customer Email</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@domain.com"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="Billing Issues">Billing Issues</option>
                    <option value="Technical Problems">Technical Problems</option>
                    <option value="Account Requests">Account Requests</option>
                    <option value="Complaints">Complaints</option>
                    <option value="Feature Requests">Feature Requests</option>
                    <option value="General Questions">General Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Customer Inquiry Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type client description..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition cursor-pointer text-foreground text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-1.5 cursor-pointer text-sm font-semibold"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
