import React, { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { supportAPI } from '../../api/support';
import { usersAPI } from '../../api/users';
import { teamsAPI } from '../../api/teams';
import { departmentsAPI } from '../../api/departments';
import {
  LifeBuoy, Plus, Sparkles, MessageCircle, AlertTriangle, X, Heart, Meh, Frown,
  CheckCircle, BarChart3, LayoutGrid, RefreshCw, UserPlus, RotateCcw, Lock,
} from 'lucide-react';
import {
  appPageShellTall, appToolbarRow, appGrid, appPageTitle, appPageDesc, appBtnPrimary,
  appBtnGhost, appBtnIcon, appGlassCard, appCardPadding, appInputPlain, appSelect,
  appLabel, appModalOverlay, appModal, appBadgeError, appBadgeActive, appBadgeWarning,
  appTabActive, appTabInactive, appSectionTitle, appEmpty,
} from '../../styles/appStyles';

const KANBAN_COLUMNS = ['New', 'In Progress', 'Resolved', 'Closed'];

const CATEGORIES = [
  'Billing Issues',
  'Technical Problems',
  'Account Requests',
  'Complaints',
  'Feature Requests',
  'General Questions',
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function normalizeTicket(t) {
  if (!t) return null;
  return {
    ...t,
    aiRecommendation: t.ai_recommendation || t.aiRecommendation || '',
    displayId: t.ticket_number || `TCK-${t.id}`,
  };
}

function sentimentIcon(sentiment) {
  switch (sentiment) {
    case 'Positive': return <Heart className="text-green-600 fill-green-100" size={14} />;
    case 'Neutral': return <Meh className="text-yellow-600 fill-yellow-100" size={14} />;
    case 'Negative': return <Frown className="text-red-600 fill-red-100" size={14} />;
    default: return null;
  }
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [category, setCategory] = useState('General Questions');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');

  const [assignUserId, setAssignUserId] = useState('');
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignDeptId, setAssignDeptId] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setErrorText('');
    try {
      const { data } = await supportAPI.listTickets();
      const normalized = (data || []).map(normalizeTicket);
      setTickets(normalized);
      setSelectedTicket((prev) => (
        prev ? normalized.find((t) => t.id === prev.id) || null : null
      ));
    } catch {
      setErrorText('Unable to load support tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const { data: metricsRes, refetch: refetchMetrics } = useQuery({
    queryKey: ['support-metrics'],
    queryFn: () => supportAPI.metrics(),
    enabled: activeTab === 'analytics',
  });

  const { data: usersRes } = useQuery({
    queryKey: ['support-users'],
    queryFn: () => usersAPI.list(),
    enabled: !!selectedTicket,
  });

  const { data: teamsRes } = useQuery({
    queryKey: ['support-teams'],
    queryFn: () => teamsAPI.list(),
    enabled: !!selectedTicket,
  });

  const { data: deptsRes } = useQuery({
    queryKey: ['support-departments'],
    queryFn: () => departmentsAPI.list(),
    enabled: !!selectedTicket,
  });

  const users = usersRes?.data || [];
  const teams = teamsRes?.data || [];
  const departments = deptsRes?.data || [];
  const metrics = metricsRes?.data;

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!title.trim() || !customer.trim() || !message.trim()) return;
    try {
      const { data: saved } = await supportAPI.createTicket({
        title, customer, message, category, priority, status: 'New',
      });
      const newTicket = normalizeTicket(saved);
      setTickets((prev) => [newTicket, ...prev]);
      setIsCreateOpen(false);
      setTitle('');
      setCustomer('');
      setCategory('General Questions');
      setMessage('');
      setPriority('medium');
    } catch {
      setErrorText('Failed to create ticket.');
    }
  };

  const patchLocalTicket = (updated) => {
    const normalized = normalizeTicket(updated);
    setTickets((prev) => prev.map((t) => (t.id === normalized.id ? normalized : t)));
    setSelectedTicket(normalized);
  };

  const handleMoveStatus = async (ticketId, newStatus) => {
    try {
      const { data } = await supportAPI.updateTicket(ticketId, { status: newStatus });
      patchLocalTicket(data);
    } catch {
      setErrorText('Failed to update ticket status.');
    }
  };

  const handleEscalate = async (ticketId) => {
    try {
      const { data } = await supportAPI.escalateTicket(ticketId, {
        reason: 'Manual escalation to manager',
      });
      patchLocalTicket(data);
    } catch {
      setErrorText('Failed to escalate ticket.');
    }
  };

  const handleAssign = async () => {
    if (!selectedTicket) return;
    try {
      const payload = {};
      if (assignUserId) payload.user_id = Number(assignUserId);
      if (assignTeamId) payload.team_id = Number(assignTeamId);
      if (assignDeptId) payload.department_id = Number(assignDeptId);
      const { data } = await supportAPI.assignTicket(selectedTicket.id, payload);
      patchLocalTicket(data);
    } catch {
      setErrorText('Failed to assign ticket.');
    }
  };

  const handleClose = async (ticketId) => {
    try {
      const { data } = await supportAPI.closeTicket(ticketId);
      patchLocalTicket(data);
    } catch {
      setErrorText('Failed to close ticket.');
    }
  };

  const handleReopen = async (ticketId) => {
    try {
      const { data } = await supportAPI.reopenTicket(ticketId);
      patchLocalTicket(data);
    } catch {
      setErrorText('Failed to reopen ticket.');
    }
  };

  const handleRegenerate = async (ticketId) => {
    try {
      const { data } = await supportAPI.regenerateRecommendation(ticketId);
      patchLocalTicket(data);
    } catch {
      setErrorText('Failed to regenerate AI recommendation.');
    }
  };

  const openTicketDrawer = (ticket) => {
    setSelectedTicket(ticket);
    setAssignUserId(ticket.assigned_to_user_id ? String(ticket.assigned_to_user_id) : '');
    setAssignTeamId(ticket.assigned_to_team_id ? String(ticket.assigned_to_team_id) : '');
    setAssignDeptId(ticket.assigned_to_department_id ? String(ticket.assigned_to_department_id) : '');
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
            <p className={appPageDesc}>
              Manage inquiries, categorize issues, analyze sentiment, assign teams, and deliver AI-assisted responses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <button type="button" onClick={loadTickets} className={appBtnGhost}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button type="button" onClick={() => setIsCreateOpen(true)} className={appBtnPrimary}>
              <Plus size={18} />
              Create Ticket
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 border-b border-[#1A1A14]/10 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? appTabActive : appTabInactive}
          >
            <LayoutGrid size={14} className="inline mr-1.5" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('analytics'); refetchMetrics(); }}
            className={activeTab === 'analytics' ? appTabActive : appTabInactive}
          >
            <BarChart3 size={14} className="inline mr-1.5" />
            Analytics
          </button>
        </div>

        {errorText && (
          <div className={`${appBadgeError} mb-4 px-3 py-2 text-xs`}>{errorText}</div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {loading ? (
              <div className={appEmpty}>Loading tickets...</div>
            ) : (
              <div className={`${appGrid} grid-cols-1 md:grid-cols-2 xl:grid-cols-4 flex-1 min-h-0 min-w-0 overflow-y-auto`}>
                {KANBAN_COLUMNS.map((colStatus) => {
                  const colTickets = tickets.filter((t) => t.status === colStatus);
                  return (
                    <div key={colStatus} className={`${appGlassCard} !p-4 flex flex-col h-full min-h-[300px] min-w-0`}>
                      <div className="flex justify-between items-center mb-4 border-b border-[#1A1A14]/10 pb-2">
                        <h3 className="font-bold text-sm text-[#1A1A14] flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            colStatus === 'New' ? 'bg-red-500' :
                            colStatus === 'In Progress' ? 'bg-[#1A1A14]' :
                            colStatus === 'Resolved' ? 'bg-emerald-500' : 'bg-[#6A6A60]'
                          }`} />
                          {colStatus}
                        </h3>
                        <span className="bg-[#1A1A14]/10 text-[#1A1A14] text-xs px-2.5 py-0.5 rounded-full font-bold">
                          {colTickets.length}
                        </span>
                      </div>
                      <div className="space-y-3 overflow-y-auto flex-1 pr-1 min-w-0">
                        {colTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openTicketDrawer(ticket)}
                            onKeyDown={(e) => e.key === 'Enter' && openTicketDrawer(ticket)}
                            className={`bg-white/50 border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#1A1A14]/25 transition cursor-pointer space-y-3 min-w-0 ${
                              selectedTicket?.id === ticket.id
                                ? 'border-[#1A1A14]/30 ring-1 ring-[#1A1A14]/20'
                                : 'border-[#1A1A14]/10'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1 min-w-0">
                              <span className="text-[10px] font-bold text-[#6A6A60]">{ticket.displayId}</span>
                              <div className="flex gap-1.5 items-center flex-shrink-0">
                                {ticket.escalated && (
                                  <span className={`${appBadgeError} text-[9px] font-semibold px-2 py-0.5 flex items-center gap-0.5`}>
                                    <AlertTriangle size={8} /> Esc
                                  </span>
                                )}
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  ticket.sentiment === 'Positive' ? appBadgeActive :
                                  ticket.sentiment === 'Negative' ? appBadgeError : appBadgeWarning
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
                              <span className="text-[9px] text-[#6A6A60] uppercase">{ticket.priority}</span>
                            </div>
                          </div>
                        ))}
                        {colTickets.length === 0 && (
                          <div className="h-32 border border-dashed border-[#1A1A14]/15 rounded-xl flex items-center justify-center text-xs text-[#6A6A60] italic">
                            No {colStatus.toLowerCase()} tickets
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <div className={`${appGrid} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
            {!metrics ? (
              <div className={appEmpty}>Loading analytics...</div>
            ) : (
              <>
                {[
                  { label: 'Total Tickets', value: metrics.total_tickets },
                  { label: 'Open Tickets', value: metrics.open_tickets },
                  { label: 'Resolution Rate', value: `${metrics.resolution_rate}%` },
                  { label: 'Escalation Rate', value: `${metrics.escalation_rate}%` },
                  { label: 'Avg Resolution (hrs)', value: metrics.average_resolution_hours ?? '—' },
                  { label: 'Resolved', value: metrics.resolved_tickets },
                ].map((item) => (
                  <div key={item.label} className={`${appGlassCard} ${appCardPadding}`}>
                    <p className="text-xs text-[#6A6A60] font-bold uppercase">{item.label}</p>
                    <p className="text-2xl font-bold text-[#1A1A14] mt-1">{item.value}</p>
                  </div>
                ))}
                <div className={`${appGlassCard} ${appCardPadding} md:col-span-2 lg:col-span-3`}>
                  <h3 className={appSectionTitle}>Category Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                    {Object.entries(metrics.category_distribution || {}).map(([cat, count]) => (
                      <div key={cat} className="bg-[#1A1A14]/5 rounded-lg px-3 py-2 text-xs flex justify-between">
                        <span>{cat}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${appGlassCard} ${appCardPadding} md:col-span-2 lg:col-span-3`}>
                  <h3 className={appSectionTitle}>Sentiment Distribution</h3>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {Object.entries(metrics.sentiment_distribution || {}).map(([sent, count]) => (
                      <span key={sent} className="bg-[#1A1A14]/5 rounded-full px-3 py-1 text-xs font-bold">
                        {sent}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {selectedTicket && (
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white/90 backdrop-blur-md border-l border-[#1A1A14]/10 shadow-[0_16px_48px_-12px_rgba(26,26,20,0.2)] flex flex-col animate-[slide-in_0.3s] min-w-0">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#1A1A14]/10 bg-[#1A1A14]/[0.04] mt-16 md:mt-0 gap-3 min-w-0">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#6A6A60]">{selectedTicket.displayId}</span>
                <h3 className="font-bold text-sm text-[#1A1A14] truncate">{selectedTicket.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedTicket(null)} className={appBtnIcon}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#1A1A14] uppercase tracking-wider">Customer Details</p>
                <div className="bg-[#1A1A14]/[0.04] border border-[#1A1A14]/10 p-3 rounded-xl text-xs space-y-1 text-[#1A1A14]">
                  <p><strong>Email:</strong> {selectedTicket.customer}</p>
                  <p><strong>Category:</strong> {selectedTicket.category}</p>
                  <p><strong>Priority:</strong> {selectedTicket.priority}</p>
                  <p className="flex items-center gap-1.5">
                    <strong>Sentiment:</strong>
                    {sentimentIcon(selectedTicket.sentiment)}
                    <span>{selectedTicket.sentiment}</span>
                  </p>
                  {selectedTicket.assigned_to_label && (
                    <p><strong>Assigned:</strong> {selectedTicket.assigned_to_label}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-[#1A1A14] uppercase tracking-wider">Inquiry Message</p>
                <div className="bg-[#1A1A14]/[0.03] border border-[#1A1A14]/10 p-3 rounded-xl text-xs leading-relaxed text-[#1A1A14] whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[#1A1A14] uppercase tracking-wider flex items-center gap-1">
                  <UserPlus size={12} /> Assignment
                </p>
                <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className={appSelect}>
                  <option value="">Assign to user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name || ''} ({u.email})</option>
                  ))}
                </select>
                <select value={assignTeamId} onChange={(e) => setAssignTeamId(e.target.value)} className={appSelect}>
                  <option value="">Assign to team...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select value={assignDeptId} onChange={(e) => setAssignDeptId(e.target.value)} className={appSelect}>
                  <option value="">Assign to department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button type="button" onClick={handleAssign} className={`${appBtnGhost} w-full !text-xs`}>
                  Save Assignment
                </button>
              </div>

              {selectedTicket.escalation_history?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#1A1A14] uppercase tracking-wider">Escalation History</p>
                  <div className="space-y-2">
                    {selectedTicket.escalation_history.map((entry, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-2 text-[10px] text-[#1A1A14]">
                        <p className="font-bold">{entry.reason}</p>
                        <p className="text-[#6A6A60]">{entry.at}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#1A1A14]/5 border border-[#1A1A14]/15 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A14]">
                    <Sparkles size={14} />
                    AI Suggested Response
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRegenerate(selectedTicket.id)}
                    className={`${appBtnGhost} !px-2 !py-1 !text-[10px]`}
                  >
                    Regenerate
                  </button>
                </div>
                <div className="bg-white/50 border border-[#1A1A14]/10 p-3 rounded-xl text-xs leading-relaxed text-[#1A1A14]">
                  {selectedTicket.aiRecommendation}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {!selectedTicket.escalated && (
                    <button
                      type="button"
                      onClick={() => handleEscalate(selectedTicket.id)}
                      className={`${appBtnGhost} !px-2.5 !py-1 !text-[10px] !font-bold`}
                    >
                      Escalate
                    </button>
                  )}
                  {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(selectedTicket.id, 'Resolved')}
                      className={`${appBtnPrimary} !px-2.5 !py-1 !text-[10px] !font-bold`}
                    >
                      <CheckCircle size={10} /> Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#1A1A14]/10 bg-[#1A1A14]/[0.04] flex flex-col gap-2">
              <span className="text-xs font-bold text-[#6A6A60]">Status Actions</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedTicket.status !== 'In Progress' && selectedTicket.status !== 'Closed' && (
                  <button
                    type="button"
                    onClick={() => handleMoveStatus(selectedTicket.id, 'In Progress')}
                    className={`${appBtnGhost} !px-2 !py-1 !text-[10px] !font-bold`}
                  >
                    Mark Active
                  </button>
                )}
                {selectedTicket.status !== 'Closed' && (
                  <button
                    type="button"
                    onClick={() => handleClose(selectedTicket.id)}
                    className={`${appBtnGhost} !px-2 !py-1 !text-[10px] !font-bold`}
                  >
                    <Lock size={10} /> Close
                  </button>
                )}
                {(selectedTicket.status === 'Closed' || selectedTicket.status === 'Resolved') && (
                  <button
                    type="button"
                    onClick={() => handleReopen(selectedTicket.id)}
                    className={`${appBtnGhost} !px-2 !py-1 !text-[10px] !font-bold`}
                  >
                    <RotateCcw size={10} /> Reopen
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isCreateOpen && (
          <div className={appModalOverlay}>
            <div className={`${appModal} !max-w-md !p-0 overflow-hidden`}>
              <div className={`flex justify-between items-center ${appCardPadding} border-b border-[#1A1A14]/10 bg-[#1A1A14]/[0.04]`}>
                <h2 className="text-xl font-bold text-[#1A1A14] flex items-center gap-2">
                  <MessageCircle size={20} className="text-[#1A1A14]" />
                  Create Ticket
                </h2>
                <button type="button" onClick={() => setIsCreateOpen(false)} className={appBtnIcon}>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={appLabel}>Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={appSelect}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={appLabel}>Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className={appSelect}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
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
                  <button type="button" onClick={() => setIsCreateOpen(false)} className={appBtnGhost}>
                    Cancel
                  </button>
                  <button type="submit" className={appBtnPrimary}>
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
