import React, { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { omnichannelAPI } from '../../api/omnichannel';
import { usersAPI } from '../../api/users';
import {
  MessageCircle, Globe, Send, User, Bot, ShieldCheck, Check, Sparkles,
  RefreshCw, Plus, X, Filter, FileText, LifeBuoy, RotateCcw,
} from 'lucide-react';
import {
  appPageShellTall, appGrid, appPageTitle, appPageDesc, appBtnPrimary, appBtnGhost,
  appGlassCard, appInputPlain, appBadgeActive, appBadgeError, appBadgeInfo,
  appSelect, appLabel, appModalOverlay, appModal, appCardPadding, appBtnIcon,
  appSectionTitle, appEmpty,
} from '../../styles/appStyles';

const CHANNELS = ['All Channels', 'Website Chat', 'Telegram', 'Slack', 'Internal Messaging'];

function avatarFromName(name) {
  return (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  return d.toLocaleDateString();
}

function channelIcon(channel) {
  switch (channel) {
    case 'Website Chat': return <Globe className="text-blue-500" size={14} />;
    case 'Telegram': return <Send className="text-sky-500" size={14} />;
    case 'Slack': return <span className="font-bold text-pink-600 text-xs">#</span>;
    default: return <MessageCircle className="text-[#6A6A60]" size={14} />;
  }
}

function statusBadgeClass(status) {
  if (status === 'AI Active') return appBadgeActive;
  if (status === 'Human Active') return appBadgeInfo;
  if (status === 'Awaiting Hand-off') return appBadgeError;
  return 'bg-[#1A1A14]/10 text-[#1A1A14] text-[9px] font-bold px-2 py-0.5 rounded-full';
}

export default function OmnichannelPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [inputText, setInputText] = useState('');
  const [channelFilter, setChannelFilter] = useState('All Channels');
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');

  const [newChannel, setNewChannel] = useState('Website Chat');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const loadConversations = useCallback(async (selectId) => {
    setLoading(true);
    setErrorText('');
    try {
      const params = {};
      if (channelFilter !== 'All Channels') params.channel = channelFilter;
      const { data } = await omnichannelAPI.listConversations(params);
      setConversations(data || []);
      if (selectId) {
        const found = (data || []).find((c) => c.id === selectId);
        if (found) {
          const { data: detail } = await omnichannelAPI.getConversation(found.id);
          setActiveConv(detail);
        }
      } else if (data?.length) {
        const { data: detail } = await omnichannelAPI.getConversation(data[0].id);
        setActiveConv(detail);
      } else {
        setActiveConv(null);
      }
    } catch {
      setErrorText('Unable to load omnichannel conversations.');
    } finally {
      setLoading(false);
    }
  }, [channelFilter]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const { data: usersRes } = useQuery({
    queryKey: ['omnichannel-users'],
    queryFn: () => usersAPI.list(),
    enabled: !!activeConv,
  });
  const users = usersRes?.data || [];

  const selectConversation = async (conv) => {
    try {
      const { data } = await omnichannelAPI.getConversation(conv.id);
      setActiveConv(data);
      setAssignUserId(data.assigned_to_user_id ? String(data.assigned_to_user_id) : '');
    } catch {
      setErrorText('Failed to load conversation.');
    }
  };

  const handleSendMessage = async (text, senderType = 'human') => {
    if (!text?.trim() || !activeConv) return;
    try {
      const { data } = await omnichannelAPI.postMessage(activeConv.id, {
        content: text,
        sender_type: senderType,
      });
      setActiveConv(data);
      setConversations((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data, messages: undefined } : c)));
      if (senderType === 'human') setInputText('');
    } catch {
      setErrorText('Failed to send message.');
    }
  };

  const handleApproveReply = () => {
    if (activeConv?.ai_suggestion) {
      handleSendMessage(activeConv.ai_suggestion, 'ai');
    }
  };

  const handleHandoff = async () => {
    if (!activeConv) return;
    try {
      const payload = { reason: 'Operator requested human handoff' };
      if (assignUserId) payload.user_id = Number(assignUserId);
      const { data } = await omnichannelAPI.handoff(activeConv.id, payload);
      setActiveConv(data);
      loadConversations(data.id);
    } catch {
      setErrorText('Handoff failed.');
    }
  };

  const handleReturnToAi = async () => {
    if (!activeConv) return;
    try {
      const { data } = await omnichannelAPI.returnToAi(activeConv.id);
      setActiveConv(data);
      loadConversations(data.id);
    } catch {
      setErrorText('Failed to return conversation to AI.');
    }
  };

  const handleRegenerate = async () => {
    if (!activeConv) return;
    try {
      const { data } = await omnichannelAPI.regenerateSuggestion(activeConv.id);
      setActiveConv(data);
    } catch {
      setErrorText('Failed to regenerate suggestion.');
    }
  };

  const handleRefreshContext = async () => {
    if (!activeConv) return;
    try {
      const { data } = await omnichannelAPI.refreshContext(activeConv.id);
      setActiveConv(data);
    } catch {
      setErrorText('Failed to refresh shared context.');
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeConv) return;
    try {
      await omnichannelAPI.generateSummary(activeConv.id);
      const { data } = await omnichannelAPI.getConversation(activeConv.id);
      setActiveConv(data);
    } catch {
      setErrorText('Failed to generate summary.');
    }
  };

  const handleCreateSupportTicket = async () => {
    if (!activeConv) return;
    try {
      const { data } = await omnichannelAPI.createSupportTicket(activeConv.id);
      setActiveConv(data);
      loadConversations(data.id);
    } catch {
      setErrorText('Failed to create support ticket.');
    }
  };

  const handleCreateConversation = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const { data } = await omnichannelAPI.createConversation({
        channel: newChannel,
        participant_name: newName,
        participant_email: newEmail || undefined,
        participant_company: newCompany || undefined,
        initial_message: newMessage || undefined,
      });
      setIsCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewCompany('');
      setNewMessage('');
      await loadConversations(data.id);
    } catch {
      setErrorText('Failed to create conversation.');
    }
  };

  const messages = activeConv?.messages || [];

  return (
    <MainLayout>
      <div className={appPageShellTall}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
          <div className="min-w-0">
            <h1 className={`${appPageTitle} flex items-center gap-2`}>
              <MessageCircle size={32} className="text-[#1A1A14] flex-shrink-0" />
              Omnichannel Communication Center
            </h1>
            <p className={appPageDesc}>
              Unified inbox for Website Chat, Telegram, Slack, and Internal Messaging with shared context and AI-assisted replies.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <button type="button" onClick={() => loadConversations(activeConv?.id)} className={appBtnGhost}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button" onClick={() => setIsCreateOpen(true)} className={appBtnPrimary}>
              <Plus size={16} /> New Conversation
            </button>
          </div>
        </div>

        {errorText && (
          <div className={`${appBadgeError} mb-4 px-3 py-2 text-xs`}>{errorText}</div>
        )}

        <div className={`${appGrid} grid-cols-1 lg:grid-cols-4 flex-1 min-h-0 min-w-0 overflow-y-auto`}>
          {/* Inbox */}
          <div className={`lg:col-span-1 ${appGlassCard} !p-4 flex flex-col h-full overflow-hidden min-w-0`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-xs text-[#6A6A60] uppercase tracking-wider">Unified Inbox</h3>
              <Filter size={14} className="text-[#6A6A60]" />
            </div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className={`${appSelect} !text-xs mb-3`}
            >
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1 min-w-0">
              {loading ? (
                <div className={appEmpty}>Loading...</div>
              ) : conversations.length === 0 ? (
                <div className={appEmpty}>No conversations yet.</div>
              ) : conversations.map((conv) => (
                <div
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectConversation(conv)}
                  onKeyDown={(e) => e.key === 'Enter' && selectConversation(conv)}
                  className={`p-3 border rounded-xl cursor-pointer transition flex gap-3 min-w-0 ${
                    activeConv?.id === conv.id
                      ? 'border-[#1A1A14]/30 bg-[#1A1A14]/5 ring-1 ring-[#1A1A14]/10'
                      : 'border-[#1A1A14]/10 bg-[#1A1A14]/[0.03] hover:bg-[#1A1A14]/[0.06]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center font-bold text-xs text-[#1A1A14] flex-shrink-0">
                    {avatarFromName(conv.participant_name)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <h4 className="text-xs font-bold text-[#1A1A14] truncate">{conv.participant_name}</h4>
                      <span className="text-[9px] text-[#6A6A60] flex-shrink-0">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <p className="text-[10px] text-[#6A6A60] truncate">{conv.last_message_preview || 'No messages'}</p>
                    <div className="flex justify-between items-center pt-1 gap-2">
                      <span className="flex items-center gap-1 text-[9px] text-[#1A1A14] font-semibold min-w-0 truncate">
                        {channelIcon(conv.channel)}
                        {conv.channel}
                      </span>
                      <span className={statusBadgeClass(conv.status)}>{conv.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className={`lg:col-span-2 ${appGlassCard} flex flex-col justify-between h-full overflow-hidden min-w-0 !p-4`}>
            {!activeConv ? (
              <div className={appEmpty}>Select or create a conversation.</div>
            ) : (
              <>
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-[#1A1A14]/10 pb-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center font-bold text-xs text-[#1A1A14] flex-shrink-0">
                        {avatarFromName(activeConv.participant_name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-[#1A1A14] truncate">{activeConv.participant_name}</h3>
                        <p className="text-[10px] text-[#6A6A60]">Channel: {activeConv.channel}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      {activeConv.handoff_status === 'ai' ? (
                        <button type="button" onClick={handleHandoff} className={`${appBtnGhost} !px-2.5 !py-1 !text-[10px] !font-bold`}>
                          Delegate to Human
                        </button>
                      ) : (
                        <button type="button" onClick={handleReturnToAi} className={`${appBtnGhost} !px-2.5 !py-1 !text-[10px] !font-bold`}>
                          <RotateCcw size={10} /> Return to AI
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 select-text min-w-0">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 min-w-0 ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender_type !== 'user' && (
                          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs ${
                            msg.sender_type === 'ai' ? 'bg-[#1A1A14]/10 text-[#1A1A14]' :
                            msg.sender_type === 'system' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {msg.sender_type === 'ai' ? <Bot size={14} /> : <User size={14} />}
                          </div>
                        )}
                        <div className={`max-w-[85%] sm:max-w-md p-3 rounded-xl text-xs leading-relaxed min-w-0 ${
                          msg.sender_type === 'user'
                            ? 'bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] rounded-tr-none'
                            : msg.sender_type === 'ai'
                            ? 'bg-[#1A1A14]/[0.06] text-[#1A1A14] rounded-tl-none border border-[#1A1A14]/10'
                            : msg.sender_type === 'system'
                            ? 'bg-amber-50 text-amber-900 border border-amber-100 rounded-tl-none italic'
                            : 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText, 'human'); }}
                  className="flex flex-col sm:flex-row gap-2 border-t border-[#1A1A14]/10 pt-4 mt-4 min-w-0"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={activeConv.handoff_status === 'human'
                      ? 'Type human operator response...'
                      : 'Type message (AI will auto-reply to customers)...'}
                    className={`${appInputPlain} flex-1 min-w-0 !text-xs`}
                  />
                  <button type="submit" disabled={!inputText.trim()} className={`${appBtnPrimary} !px-4 !py-2 !text-xs !font-bold flex-shrink-0`}>
                    <Send size={14} />
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Context panel */}
          <div className="lg:col-span-1 space-y-4 min-w-0">
            {activeConv && (
              <>
                <div className={`${appGlassCard} !p-4 space-y-3 text-xs min-w-0`}>
                  <h3 className="font-bold text-xs text-[#6A6A60] uppercase tracking-wider">Customer Context</h3>
                  <div className="space-y-2 text-[#1A1A14]">
                    <p className="break-words"><strong>Email:</strong> {activeConv.participant_email || '—'}</p>
                    <p className="break-words"><strong>Organization:</strong> {activeConv.participant_company || '—'}</p>
                    {activeConv.assigned_to_label && (
                      <p><strong>Assigned:</strong> {activeConv.assigned_to_label}</p>
                    )}
                    {activeConv.support_ticket_id && (
                      <p className={`flex items-center gap-1 ${appBadgeInfo} !rounded-xl p-2`}>
                        <LifeBuoy size={12} /> Support Ticket #{activeConv.support_ticket_id}
                      </p>
                    )}
                    <p className={`flex items-center gap-1 text-[10px] ${appBadgeActive} !rounded-xl p-2`}>
                      <ShieldCheck size={12} className="flex-shrink-0" />
                      Org-scoped conversation
                    </p>
                  </div>
                </div>

                <div className={`${appGlassCard} !p-4 space-y-2 text-xs min-w-0`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={appSectionTitle}>Shared Context</h3>
                    <button type="button" onClick={handleRefreshContext} className={`${appBtnGhost} !px-2 !py-1 !text-[10px]`}>
                      Refresh
                    </button>
                  </div>
                  <div className="bg-[#1A1A14]/[0.03] border border-[#1A1A14]/10 p-3 rounded-xl leading-relaxed text-[#1A1A14] max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {activeConv.shared_context || 'No shared context yet. Send messages or refresh to pull knowledge base context.'}
                  </div>
                </div>

                <div className={`${appGlassCard} !p-4 space-y-2 text-xs min-w-0`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={appSectionTitle}>Conversation Summary</h3>
                    <button type="button" onClick={handleGenerateSummary} className={`${appBtnGhost} !px-2 !py-1 !text-[10px]`}>
                      <FileText size={10} /> Generate
                    </button>
                  </div>
                  <div className="bg-white/50 border border-[#1A1A14]/10 p-3 rounded-xl leading-relaxed text-[#1A1A14] max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {activeConv.summary || 'No summary generated yet.'}
                  </div>
                </div>

                <div className="bg-[#1A1A14]/5 border border-[#1A1A14]/15 rounded-2xl p-4 space-y-3 text-xs min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-[#1A1A14]">
                      <Sparkles size={14} />
                      AI Reply Suggestion
                    </div>
                    <button type="button" onClick={handleRegenerate} className={`${appBtnGhost} !px-2 !py-1 !text-[10px]`}>
                      Regenerate
                    </button>
                  </div>
                  <div className="bg-white/50 border border-[#1A1A14]/10 p-3 rounded-xl leading-relaxed text-[#1A1A14] text-[11px] select-text max-h-32 overflow-y-auto">
                    {activeConv.ai_suggestion || 'No suggestion available.'}
                  </div>
                  <button
                    type="button"
                    onClick={handleApproveReply}
                    disabled={!activeConv.ai_suggestion}
                    className={`${appBtnPrimary} w-full !text-[10px] !font-bold !py-2`}
                  >
                    <Check size={12} />
                    Approve &amp; Send Draft
                  </button>
                </div>

                <div className={`${appGlassCard} !p-4 space-y-2 text-xs`}>
                  <h3 className={appSectionTitle}>Human Handoff</h3>
                  <select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className={appSelect}
                  >
                    <option value="">Assign agent (optional)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name || ''}</option>
                    ))}
                  </select>
                  <button type="button" onClick={handleHandoff} className={`${appBtnGhost} w-full !text-[10px]`}>
                    Escalate to Human Agent
                  </button>
                  <button type="button" onClick={handleCreateSupportTicket} className={`${appBtnGhost} w-full !text-[10px]`}>
                    <LifeBuoy size={12} className="inline mr-1" />
                    Create Support Ticket
                  </button>
                  {activeConv.handoff_history?.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-[#1A1A14]/10">
                      {activeConv.handoff_history.map((h, i) => (
                        <div key={i} className="text-[10px] text-[#6A6A60]">
                          {h.action}: {h.reason} — {h.at}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {isCreateOpen && (
          <div className={appModalOverlay}>
            <div className={`${appModal} !max-w-md !p-0 overflow-hidden`}>
              <div className={`flex justify-between items-center ${appCardPadding} border-b border-[#1A1A14]/10 bg-[#1A1A14]/[0.04]`}>
                <h2 className="text-xl font-bold text-[#1A1A14]">New Conversation</h2>
                <button type="button" onClick={() => setIsCreateOpen(false)} className={appBtnIcon}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateConversation} className={`${appCardPadding} space-y-4`}>
                <div>
                  <label className={appLabel}>Channel</label>
                  <select value={newChannel} onChange={(e) => setNewChannel(e.target.value)} className={appSelect}>
                    {CHANNELS.filter((c) => c !== 'All Channels').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={appLabel}>Participant Name</label>
                  <input required value={newName} onChange={(e) => setNewName(e.target.value)} className={appInputPlain} />
                </div>
                <div>
                  <label className={appLabel}>Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={appInputPlain} />
                </div>
                <div>
                  <label className={appLabel}>Company</label>
                  <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className={appInputPlain} />
                </div>
                <div>
                  <label className={appLabel}>Initial Message</label>
                  <textarea rows={3} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className={`${appInputPlain} resize-none`} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className={appBtnGhost}>Cancel</button>
                  <button type="submit" className={appBtnPrimary}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
