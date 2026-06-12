import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { voiceAPI } from '../../api/voice';
import { aiEmployeesAPI } from '../../api/aiEmployees';
import {
  Mic, MicOff, Loader, MessageSquare, Volume2, Sparkles, Play,
  History, BarChart3, Users, Calendar, VolumeX, AlertCircle,
} from 'lucide-react';
import {
  appPageShellTall, appGrid, appPageTitle, appPageDesc, appSectionTitle,
  appGlassCard, appBtnPrimary, appBtnGhost, appBadgeActive, appBadgeWarning,
  appBadgeInfo, appEmpty, appTabActive, appTabInactive, appInputPlain, appLabel,
} from '../../styles/appStyles';

const SUGGESTED_COMMANDS = [
  'What is the leave policy?',
  'Create support ticket for billing issue',
  'Show open tickets',
  'Show omnichannel inbox',
  "Summarize today's support tickets.",
  'Explain the reimbursement process.',
  'Analyze AI market in India',
  'Find React developer jobs',
  'Start onboarding workflow',
  'Run research collaboration',
];

const ASSISTANT_OPTIONS = [
  { value: '', label: 'Auto-detect intent' },
  { value: 'HR Assistant', label: 'HR Assistant' },
  { value: 'Support Assistant', label: 'Support Assistant' },
  { value: 'Research Assistant', label: 'Research Assistant' },
  { value: 'Documentation Assistant', label: 'Documentation Assistant' },
];

export default function VoicePage() {
  const [activeTab, setActiveTab] = useState('live');
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Offline');
  const [conversations, setConversations] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [assistantRole, setAssistantRole] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [errorText, setErrorText] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const recognitionRef = useRef(null);
  const lastTranscriptRef = useRef('');

  const { data: employeesRes } = useQuery({
    queryKey: ['ai-employees-voice'],
    queryFn: () => aiEmployeesAPI.list(),
  });
  const { data: historyRes, refetch: refetchHistory } = useQuery({
    queryKey: ['voice-interactions'],
    queryFn: () => voiceAPI.listInteractions(100),
    enabled: activeTab === 'history',
  });
  const { data: sessionsRes, refetch: refetchSessions } = useQuery({
    queryKey: ['voice-sessions'],
    queryFn: () => voiceAPI.listSessions(50),
    enabled: activeTab === 'history',
  });
  const { data: analyticsRes, refetch: refetchAnalytics } = useQuery({
    queryKey: ['voice-analytics'],
    queryFn: () => voiceAPI.analytics(),
    enabled: activeTab === 'analytics',
  });
  const { data: meetingsRes, refetch: refetchMeetings } = useQuery({
    queryKey: ['voice-meetings'],
    queryFn: () => voiceAPI.listMeetings(50),
    enabled: activeTab === 'meetings',
  });

  const employees = (employeesRes?.data || []).filter((e) => e.status === 'Active');

  const submitVoiceQuery = useCallback(async (queryText) => {
    const text = queryText?.trim();
    if (!text || text === lastTranscriptRef.current) return;
    lastTranscriptRef.current = text;

    setStatus('Thinking');
    setErrorText('');
    setConversations((prev) => [...prev, { type: 'user', text }]);

    try {
      const { data } = await voiceAPI.query({
        transcript: text,
        session_id: sessionId,
        employee_id: selectedEmployeeId ? Number(selectedEmployeeId) : null,
        assistant_role: assistantRole || null,
      });
      const answer = data.answer || 'No response received.';
      setStatus('Speaking');
      setConversations((prev) => [
        ...prev,
        {
          type: 'ai',
          text: answer,
          intent: data.intent,
          module: data.module_invoked,
          assistant: data.assistant_used,
        },
      ]);
      if (!isMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
      }
      refetchHistory();
      refetchAnalytics();
    } catch (err) {
      const message = err.response?.data?.detail || 'Voice request failed. Please try again.';
      setErrorText(message);
      setConversations((prev) => [
        ...prev,
        { type: 'ai', text: message, isError: true },
      ]);
    } finally {
      setTimeout(() => {
        setStatus('Listening');
        lastTranscriptRef.current = '';
      }, 1500);
    }
  }, [sessionId, selectedEmployeeId, assistantRole, isMuted, refetchHistory, refetchAnalytics]);

  const toggleSession = async () => {
    if (isActive) {
      setIsActive(false);
      setStatus('Offline');
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (sessionId) {
        try {
          await voiceAPI.closeSession(sessionId);
          refetchSessions();
        } catch {
          /* session may already be closed */
        }
      }
      setSessionId(null);
    } else {
      setErrorText('');
      setConversations([]);
      lastTranscriptRef.current = '';
      try {
        const { data: session } = await voiceAPI.createSession(assistantRole || null);
        setSessionId(session.id);
      } catch (err) {
        setErrorText(err.response?.data?.detail || 'Could not start voice session.');
        return;
      }
      setIsActive(true);
      setStatus('Connecting');
      setTimeout(() => {
        setStatus('Listening');
        setConversations([
          {
            type: 'ai',
            text: "Voice Assistant connected. Ask about policies, support tickets, research, browser tasks, workflows, or collaboration.",
          },
        ]);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setErrorText('Speech recognition is not supported in this browser. Use suggested commands or Chrome/Edge.');
          setStatus('Listening');
          return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const last = event.results[event.results.length - 1];
          if (last.isFinal) {
            submitVoiceQuery(last[0].transcript);
          }
        };
        recognition.onerror = () => {
          setErrorText('Microphone error. Check permissions and try again.');
        };
        recognition.start();
        recognitionRef.current = recognition;
      }, 800);
    }
  };

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!meetingNotes.trim()) return;
    setErrorText('');
    try {
      await voiceAPI.createMeeting({
        notes: meetingNotes,
        title: meetingTitle || meetingNotes.slice(0, 80),
        session_id: sessionId,
      });
      setMeetingNotes('');
      setMeetingTitle('');
      refetchMeetings();
    } catch (err) {
      setErrorText(err.response?.data?.detail || 'Failed to process meeting notes.');
    }
  };

  const statusBadgeClass =
    status === 'Listening' ? appBadgeActive :
    status === 'Speaking' ? appBadgeInfo :
    status === 'Thinking' ? appBadgeWarning :
    appBadgeInfo;

  const tabs = [
    { id: 'live', label: 'Live', icon: Mic },
    { id: 'history', label: 'History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
  ];

  const interactions = historyRes?.data || [];
  const sessions = sessionsRes?.data || [];
  const analytics = analyticsRes?.data || {};
  const meetings = meetingsRes?.data || [];

  return (
    <MainLayout>
      <div className={appPageShellTall}>
        <div>
          <h1 className={`${appPageTitle} flex items-center gap-2`}>
            <Mic size={32} className="text-[#1A1A14]" />
            Voice AI Platform
          </h1>
          <p className={appPageDesc}>
            Interact through voice with knowledge search, AI assistants, research, browser automation, workflows, and collaboration.
          </p>
        </div>

        <div className="border-b border-[#1A1A14]/10 flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? appTabActive : appTabInactive}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {errorText && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle size={16} />
            {errorText}
          </div>
        )}

        {activeTab === 'live' && (
          <>
            <div className={`${appGrid} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`}>
              <div>
                <label className={appLabel}>Assistant</label>
                <select
                  value={assistantRole}
                  onChange={(e) => setAssistantRole(e.target.value)}
                  className={appInputPlain}
                  disabled={isActive}
                >
                  {ASSISTANT_OPTIONS.map((opt) => (
                    <option key={opt.value || 'auto'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={appLabel}>AI Employee (optional)</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className={appInputPlain}
                  disabled={isActive}
                >
                  <option value="">Use intent routing</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.title} — {emp.data?.role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  className={`${appBtnGhost} w-full`}
                  title={isMuted ? 'Unmute responses' : 'Mute responses'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {isMuted ? 'Unmute TTS' : 'Mute TTS'}
                </button>
              </div>
            </div>

            <div className={`${appGrid} grid-cols-1 md:grid-cols-3 flex-1 min-h-0`}>
              <div className={`md:col-span-1 ${appGlassCard} flex flex-col justify-between items-center !p-6`}>
                <div className="text-center w-full space-y-1">
                  <span className={`inline-flex items-center gap-1.5 ${statusBadgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status === 'Listening' ? 'bg-emerald-600 animate-ping' :
                      status === 'Speaking' ? 'bg-[#1A1A14] animate-bounce' :
                      status === 'Thinking' ? 'bg-amber-500 animate-pulse' :
                      'bg-[#6A6A60]'
                    }`} />
                    {status}
                  </span>
                  <p className="text-xs text-[#6A6A60] mt-1">
                    {sessionId ? `Session #${sessionId}` : 'Voice Session Status'}
                  </p>
                </div>

                <div className="h-40 flex items-center justify-center w-full relative">
                  {isActive && status === 'Listening' && (
                    <div className="flex gap-1.5 items-center justify-center">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-[#1A1A14] rounded-full animate-[pulse_1s_infinite]"
                          style={{
                            height: `${30 + (i * 7)}px`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {isActive && status === 'Speaking' && (
                    <div className="flex gap-1.5 items-center justify-center">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-1.5 bg-[#4B4B42] rounded-full animate-bounce" style={{ height: `${40 + i * 8}px` }} />
                      ))}
                    </div>
                  )}
                  {isActive && status === 'Thinking' && (
                    <Loader className="animate-spin text-[#1A1A14]" size={32} />
                  )}
                  {!isActive && (
                    <div className="w-16 h-16 rounded-full bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center text-[#6A6A60]">
                      <MicOff size={28} />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={toggleSession}
                  className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition text-sm ${
                    isActive
                      ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                      : appBtnPrimary
                  }`}
                >
                  {isActive ? <MicOff size={16} /> : <Mic size={16} />}
                  {isActive ? 'End Session' : 'Start Voice Session'}
                </button>
              </div>

              <div className={`md:col-span-2 flex flex-col ${appGlassCard} overflow-hidden min-h-0 !p-6`}>
                <div className="border-b border-[#1A1A14]/10 pb-3 mb-4">
                  <h3 className={`${appSectionTitle} !text-sm flex items-center gap-1.5`}>
                    <MessageSquare size={16} />
                    Live Voice Transcript
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 max-h-72">
                  {conversations.length === 0 ? (
                    <div className={`${appEmpty} !p-4 italic`}>
                      Start a session to capture real-time speech-to-text transcriptions.
                    </div>
                  ) : (
                    conversations.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.type === 'ai' && (
                          <div className="w-6 h-6 rounded bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center flex-shrink-0 text-[#1A1A14]">
                            <Volume2 size={14} />
                          </div>
                        )}
                        <div className="max-w-md space-y-1">
                          <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                            msg.type === 'user'
                              ? 'bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] rounded-tr-none'
                              : msg.isError
                                ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-none'
                                : 'bg-white/50 border border-[#1A1A14]/10 text-[#1A1A14] rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                          {msg.module && (
                            <p className="text-[10px] text-[#6A6A60] flex items-center gap-1">
                              <Users size={10} />
                              {msg.assistant} → {msg.module}
                              {msg.intent && <span className="opacity-70">({msg.intent.replace(/_/g, ' ')})</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {isActive && status === 'Listening' && (
                  <div className="pt-4 border-t border-[#1A1A14]/10 mt-4">
                    <p className="text-[10px] font-semibold text-[#6A6A60] uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Sparkles size={11} />
                      Suggested Voice Commands
                    </p>
                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                      {SUGGESTED_COMMANDS.map((cmd) => (
                        <button
                          key={cmd}
                          type="button"
                          onClick={() => submitVoiceQuery(cmd)}
                          className={`text-left text-xs p-2 ${appBtnGhost} !justify-between`}
                        >
                          <span>&ldquo;{cmd}&rdquo;</span>
                          <Play size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className={`${appGrid} grid-cols-1 lg:grid-cols-2`}>
            <div className={appGlassCard}>
              <h3 className={`${appSectionTitle} !text-sm mb-4`}>Sessions</h3>
              {sessions.length === 0 ? (
                <div className={appEmpty}>No voice sessions yet.</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sessions.map((s) => (
                    <div key={s.id} className="p-3 border border-[#1A1A14]/10 rounded-xl text-sm">
                      <p className="font-medium text-[#1A1A14]">Session #{s.id}</p>
                      <p className="text-xs text-[#6A6A60] mt-1">
                        {s.status} · {s.interaction_count} interactions
                        {s.duration_seconds != null && ` · ${s.duration_seconds}s`}
                      </p>
                      {s.assistant_preference && (
                        <p className="text-xs text-[#6A6A60]">Assistant: {s.assistant_preference}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={appGlassCard}>
              <h3 className={`${appSectionTitle} !text-sm mb-4`}>Interaction History</h3>
              {interactions.length === 0 ? (
                <div className={appEmpty}>No voice interactions recorded.</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {interactions.map((item) => (
                    <div key={item.id} className="p-3 border border-[#1A1A14]/10 rounded-xl text-xs space-y-1">
                      <p className="font-medium text-[#1A1A14]">{item.transcript}</p>
                      <p className="text-[#6A6A60] line-clamp-3">{item.answer}</p>
                      <p className="text-[10px] text-[#6A6A60]">
                        {item.assistant_used} → {item.module_invoked}
                        {item.intent && ` · ${item.intent.replace(/_/g, ' ')}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className={`${appGrid} grid-cols-2 lg:grid-cols-4`}>
              {[
                ['Total Interactions', analytics.total_interactions ?? 0],
                ['Total Sessions', analytics.total_sessions ?? 0],
                ['Active Sessions', analytics.active_sessions ?? 0],
                ['Avg Session (s)', analytics.average_session_duration_seconds ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className={appGlassCard}>
                  <p className="text-xs text-[#6A6A60] uppercase">{label}</p>
                  <p className="text-2xl font-bold text-[#1A1A14] mt-1">{value}</p>
                </div>
              ))}
            </div>
            <div className={`${appGrid} grid-cols-1 md:grid-cols-3`}>
              {[
                ['Most Used Assistants', analytics.most_used_assistants],
                ['Most Used Commands', analytics.most_used_commands],
                ['Most Used Modules', analytics.most_used_modules],
              ].map(([title, items]) => (
                <div key={title} className={appGlassCard}>
                  <h3 className={`${appSectionTitle} !text-sm mb-3`}>{title}</h3>
                  {(items || []).length === 0 ? (
                    <p className="text-xs text-[#6A6A60]">No data yet.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {items.map((row, idx) => (
                        <li key={idx} className="flex justify-between text-[#1A1A14]">
                          <span className="truncate pr-2">
                            {row.assistant || row.intent || row.module}
                          </span>
                          <span className="text-[#6A6A60] font-medium">{row.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className={`${appGrid} grid-cols-1 lg:grid-cols-2`}>
            <form onSubmit={handleCreateMeeting} className={`${appGlassCard} space-y-4`}>
              <h3 className={`${appSectionTitle} !text-sm`}>Meeting Notes</h3>
              <div>
                <label className={appLabel}>Title (optional)</label>
                <input
                  className={appInputPlain}
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Q1 planning sync"
                />
              </div>
              <div>
                <label className={appLabel}>Notes</label>
                <textarea
                  className={`${appInputPlain} min-h-[140px]`}
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Paste or dictate meeting notes..."
                  required
                />
              </div>
              <button type="submit" className={appBtnPrimary}>Generate Summary & Action Items</button>
            </form>
            <div className={appGlassCard}>
              <h3 className={`${appSectionTitle} !text-sm mb-4`}>Meeting Summaries</h3>
              {meetings.length === 0 ? (
                <div className={appEmpty}>No meeting summaries yet.</div>
              ) : (
                <div className="space-y-4 max-h-[28rem] overflow-y-auto">
                  {meetings.map((m) => (
                    <div key={m.id} className="p-4 border border-[#1A1A14]/10 rounded-xl space-y-2 text-sm">
                      <p className="font-semibold text-[#1A1A14]">{m.title}</p>
                      <p className="text-[#6A6A60] text-xs">{m.summary}</p>
                      {m.action_items?.length > 0 && (
                        <ul className="text-xs text-[#1A1A14] list-disc pl-4 space-y-0.5">
                          {m.action_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {m.follow_up_recommendations && (
                        <p className="text-xs text-[#6A6A60] italic">{m.follow_up_recommendations}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
