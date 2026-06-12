import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { operationsAPI } from '../../api/operations';
import { LifeBuoy, Plus, Sparkles, MessageCircle, AlertTriangle, X, Heart, Meh, Frown, CheckCircle } from 'lucide-react';
import { appPageShellTall, appToolbarRow, appGrid, appPageTitle, appPageDesc, appBtnPrimary, appBtnGhost, appBtnIcon, appGlassCard, appCardPadding, appInputPlain, appSelect, appLabel, appModalOverlay, appModal, appBadgeError, appBadgeActive, appBadgeWarning } from '../../styles/appStyles';

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

  useEffect(() => {
    operationsAPI.list('support').then(({ data }) => {
      if (data.length) setTickets(data.map(item => ({ id: item.id, title: item.title, status: item.status, ...item.data })));
    }).catch(() => {});
  }, []);

  const sentimentIcon = (sentiment) => {
    switch (sentiment) {
      case "Positive": return <Heart className="text-green-600 fill-green-100" size={14} />;
      case "Neutral": return <Meh className="text-yellow-600 fill-yellow-100" size={14} />;
      case "Negative": return <Frown className="text-red-600 fill-red-100" size={14} />;
      default: return null;
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!title.trim() || !customer.trim()) return;

    const { data: saved } = await operationsAPI.create('support', {
      title, status: "New", data: { customer, category, escalated: false, message }
    });
    const newTicket = { id: saved.id, title: saved.title, status: saved.status, ...saved.data };
    setTickets([...tickets, newTicket]);
    setIsCreateOpen(false);

    // Reset
    setTitle('');
    setCustomer('');
    setCategory('Billing Issues');
    setMessage('');
  };

  const handleMoveStatus = (ticketId, newStatus) => {
    operationsAPI.update('support', ticketId, { status: newStatus }).catch(() => {});
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
    operationsAPI.update('support', ticketId, { data: { escalated: true } }).catch(() => {});
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
      <div className={appPageShellTall}>
        <div className={`${appToolbarRow} sm:items-start`}>
          <div className="min-w-0">
            <h1 className={`${appPageTitle} flex items-center gap-2`}>
              <LifeBuoy size={32} className="text-[#1A1A14] flex-shrink-0" />
              Customer Support Desk
            </h1>
            <p className={appPageDesc}>Manage client tickets, categorize issues, evaluate customer sentiment, and send recommended AI resolutions.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className={`${appBtnPrimary} flex-shrink-0`}
          >
            <Plus size={18} />
            Create Ticket
          </button>
        </div>

        {/* Kanban Board Container */}
        <div className={`${appGrid} grid-cols-1 md:grid-cols-3 flex-1 min-h-0 min-w-0 overflow-y-auto`}>
          {["New", "In Progress", "Resolved"].map(colStatus => {
            const colTickets = tickets.filter(t => t.status === colStatus);
            return (
              <div key={colStatus} className={`${appGlassCard} !p-4 flex flex-col h-full min-h-[300px] min-w-0`}>
                <div className="flex justify-between items-center mb-4 border-b border-[#1A1A14]/10 pb-2">
                  <h3 className="font-bold text-sm text-[#1A1A14] flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      colStatus === 'New' ? 'bg-red-500' :
                      colStatus === 'In Progress' ? 'bg-[#1A1A14]' :
                      'bg-emerald-500'
                    }`} />
                    {colStatus} Tickets
                  </h3>
                  <span className="bg-[#1A1A14]/10 text-[#1A1A14] text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {colTickets.length}
                  </span>
                </div>

                {/* Ticket cards */}
                <div className="space-y-3 overflow-y-auto flex-1 pr-1 min-w-0">
                  {colTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`bg-white/50 border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#1A1A14]/25 transition cursor-pointer space-y-3 min-w-0 ${
                        selectedTicket?.id === ticket.id ? 'border-[#1A1A14]/30 ring-1 ring-[#1A1A14]/20' : 'border-[#1A1A14]/10'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1 min-w-0">
                        <span className="text-[10px] font-bold text-[#6A6A60]">{ticket.id}</span>
                        <div className="flex gap-1.5 items-center flex-shrink-0">
                          {ticket.escalated && (
                            <span className={`${appBadgeError} text-[9px] font-semibold px-2 py-0.5 flex items-center gap-0.5`}>
                              <AlertTriangle size={8} /> Esc
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            ticket.sentiment === 'Positive' ? appBadgeActive :
                            ticket.sentiment === 'Negative' ? appBadgeError :
                            appBadgeWarning
                          }`}>
                            {sentimentIcon(ticket.sentiment)}
                            {ticket.sentiment}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-[#1A1A14] line-clamp-2 leading-relaxed">{ticket.title}</h4>
                      <p className="text-[10px] text-[#6A6A60] truncate">{ticket.customer}</p>

                      <div className="flex justify-between items-center pt-2 border-t border-[#1A1A14]/10">
                        <span className="text-[9px] text-[#1A1A14] font-bold bg-[#1A1A14]/5 px-2 py-0.5 rounded">
                          {ticket.category}
                        </span>
                      </div>
                    </div>
                  ))}
                  {colTickets.length === 0 && (
                    <div className="h-32 border border-dashed border-[#1A1A14]/15 rounded-xl flex items-center justify-center text-xs text-[#6A6A60] italic">
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
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white/90 backdrop-blur-md border-l border-[#1A1A14]/10 shadow-[0_16px_48px_-12px_rgba(26,26,20,0.2)] flex flex-col animate-[slide-in_0.3s] min-w-0">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#1A1A14]/10 bg-[#1A1A14]/[0.04] mt-16 md:mt-0 gap-3 min-w-0">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#6A6A60]">{selectedTicket.id}</span>
                <h3 className="font-bold text-sm text-[#1A1A14] truncate">{selectedTicket.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className={appBtnIcon}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
              {/* Customer info */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#1A1A14] uppercase tracking-wider">Customer Details</p>
                <div className="bg-[#1A1A14]/[0.04] border border-[#1A1A14]/10 p-3 rounded-xl text-xs space-y-1 text-[#1A1A14]">
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
                <p className="text-xs font-bold text-[#1A1A14] uppercase tracking-wider">Inquiry Message</p>
                <div className="bg-[#1A1A14]/[0.03] border border-[#1A1A14]/10 p-3 rounded-xl text-xs leading-relaxed text-[#1A1A14] whitespace-pre-wrap select-text">
                  {selectedTicket.message}
                </div>
              </div>

              {/* AI Recommended Response */}
              <div className="bg-[#1A1A14]/5 border border-[#1A1A14]/15 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A14]">
                  <Sparkles size={14} />
                  AI Suggested Response Resolution
                </div>
                <div className="bg-white/50 border border-[#1A1A14]/10 p-3 rounded-xl text-xs leading-relaxed text-[#1A1A14] select-text">
                  {selectedTicket.aiRecommendation}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {!selectedTicket.escalated && (
                    <button
                      onClick={() => handleEscalate(selectedTicket.id)}
                      className={`${appBtnGhost} !px-2.5 !py-1 !text-[10px] !font-bold`}
                    >
                      Escalate to Manager
                    </button>
                  )}
                  {selectedTicket.status !== 'Resolved' && (
                    <button
                      onClick={() => handleMoveStatus(selectedTicket.id, "Resolved")}
                      className={`${appBtnPrimary} !px-2.5 !py-1 !text-[10px] !font-bold`}
                    >
                      <CheckCircle size={10} /> Send AI Answer
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#1A1A14]/10 bg-[#1A1A14]/[0.04] flex flex-col sm:flex-row sm:justify-between gap-2">
              <span className="text-xs font-bold text-[#6A6A60] self-center">Action Board:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedTicket.status !== 'New' && (
                  <button
                    onClick={() => handleMoveStatus(selectedTicket.id, "New")}
                    className={`${appBtnGhost} !px-2 !py-1 !text-[10px] !font-bold`}
                  >
                    Move to New
                  </button>
                )}
                {selectedTicket.status !== 'In Progress' && (
                  <button
                    onClick={() => handleMoveStatus(selectedTicket.id, "In Progress")}
                    className={`${appBtnGhost} !px-2 !py-1 !text-[10px] !font-bold`}
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
          <div className={appModalOverlay}>
            <div className={`${appModal} !max-w-md !p-0 overflow-hidden`}>
              <div className={`flex justify-between items-center ${appCardPadding} border-b border-[#1A1A14]/10 bg-[#1A1A14]/[0.04]`}>
                <h2 className="text-xl font-bold text-[#1A1A14] flex items-center gap-2">
                  <MessageCircle size={20} className="text-[#1A1A14]" />
                  Create Ticket
                </h2>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className={appBtnIcon}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className={`${appCardPadding} space-y-4`}>
                <div>
                  <label className={appLabel}>Ticket Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Received incorrect item invoice"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={appInputPlain}
                  />
                </div>

                <div>
                  <label className={appLabel}>Customer Email</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@domain.com"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className={appInputPlain}
                  />
                </div>

                <div>
                  <label className={appLabel}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={appSelect}
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
                  <label className={appLabel}>Customer Inquiry Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type client description..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`${appInputPlain} resize-none`}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t border-[#1A1A14]/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className={appBtnGhost}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={appBtnPrimary}
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
