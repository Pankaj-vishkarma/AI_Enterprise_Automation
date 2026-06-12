import React, { useRef, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { operationsAPI } from '../../api/operations';
import { Mic, MicOff, Loader, MessageSquare, Volume2, Sparkles, Play } from 'lucide-react';
import {
  appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appBtnPrimary, appBtnGhost,
  appBadgeActive, appBadgeWarning, appBadgeInfo, appEmpty,
} from '../../styles/appStyles';

const VOICE_EXCHANGES = {
  "What is the leave policy?": {
    user: "What is the leave policy?",
    ai: "According to the Employee Handbook, you are allowed 15 days of annual paid leave, which accrues monthly. In addition, you have 10 days of paid sick leave and 5 personal days per year."
  },
  "Summarize today's support tickets.": {
    user: "Summarize today's support tickets.",
    ai: "Today, we received 12 support tickets. 6 are Billing Issues (mostly card declines), 4 are Technical Problems regarding API authentication, and 2 are General Questions. Average resolution time is currently 14 minutes."
  },
  "Explain the reimbursement process.": {
    user: "Explain the reimbursement process.",
    ai: "To claim a reimbursement: 1. Collect all receipts. 2. Navigate to Finance Portal -> Submit Claim. 3. Input department and code. Claims are reviewed by management within 5 business days and paid out in the next cycle."
  }
};

export default function VoicePage() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Offline'); // Offline, Connecting, Listening, Thinking, Speaking
  const [conversations, setConversations] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef(null);

  const toggleSession = () => {
    if (isActive) {
      setIsActive(false);
      setStatus('Offline');
      setConversations([]);
      recognitionRef.current?.stop();
    } else {
      setIsActive(true);
      setStatus('Connecting');
      setTimeout(() => {
        setStatus('Listening');
        setConversations([
          { type: 'ai', text: "Voice Assistant connected. I have access to your organization's knowledge base. What can I help you with?" }
        ]);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.onresult = (event) => submitVoiceQuery(event.results[event.results.length - 1][0].transcript);
          recognition.start();
          recognitionRef.current = recognition;
        }
      }, 1000);
    }
  };

  const submitVoiceQuery = async (queryText) => {
    if (!queryText.trim()) return;

    // Set status to user speaking / AI thinking
    setStatus('Thinking');
    setConversations(prev => [...prev, { type: 'user', text: queryText }]);

    try {
      const { data } = await operationsAPI.voiceQuery(queryText);
      setStatus('Speaking');
      setConversations(prev => [...prev, { type: 'ai', text: data.data.answer }]);
      if (!isMuted && window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.data.answer));
    } catch {
      const answer = VOICE_EXCHANGES[queryText]?.ai || "I could not find enough organizational knowledge to answer that.";
      setConversations(prev => [...prev, { type: 'ai', text: answer }]);
    } finally {
      setTimeout(() => setStatus('Listening'), 1500);
    }
  };

  const statusBadgeClass =
    status === 'Listening' ? appBadgeActive :
    status === 'Speaking' ? appBadgeInfo :
    status === 'Thinking' ? appBadgeWarning :
    appBadgeInfo;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        <div>
          <h1 className={`${appPageTitle} flex items-center gap-2`}>
            <Mic size={32} className="text-[#1A1A14]" />
            Voice AI Platform
          </h1>
          <p className={appPageDesc}>Interact with your organization's knowledge base and support tickets using natural voice commands.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Wave Visualizer & Controller Column */}
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
              <p className="text-xs text-[#6A6A60] mt-1">Voice Session Status</p>
            </div>

            {/* Pulsing Audio Wave Visualizer */}
            <div className="h-40 flex items-center justify-center w-full relative">
              {isActive && status === 'Listening' && (
                <div className="flex gap-1.5 items-center justify-center">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-[#1A1A14] rounded-full animate-[pulse_1s_infinite]" 
                      style={{ 
                        height: `${Math.random() * 50 + 10}px`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: `${0.6 + i * 0.1}s`
                      }} 
                    />
                  ))}
                </div>
              )}

              {isActive && status === 'Speaking' && (
                <div className="flex gap-1.5 items-center justify-center">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-[#4B4B42] rounded-full animate-bounce" 
                      style={{ 
                        height: `${Math.random() * 80 + 20}px`,
                        animationDelay: `${i * 0.08}s`
                      }} 
                    />
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

            {/* Start/Stop Button */}
            <button
              onClick={toggleSession}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition cursor-pointer text-sm ${
                isActive
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  : appBtnPrimary
              }`}
            >
              {isActive ? <MicOff size={16} /> : <Mic size={16} />}
              {isActive ? 'Disconnect Session' : 'Start Voice Session'}
            </button>
          </div>

          {/* Transcript & Suggested Commands Column */}
          <div className={`md:col-span-2 flex flex-col justify-between ${appGlassCard} overflow-hidden min-h-0 !p-6`}>
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="border-b border-[#1A1A14]/10 pb-3 mb-4">
                <h3 className={`${appSectionTitle} !text-sm flex items-center gap-1.5`}>
                  <MessageSquare size={16} className="text-[#1A1A14]" />
                  Live Voice Transcript Log
                </h3>
              </div>

              {/* Transcript list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 select-text scrollbar-thin max-h-72">
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
                      <div className={`max-w-md p-3 rounded-lg text-xs leading-relaxed ${
                        msg.type === 'user'
                          ? 'bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] rounded-tr-none'
                          : 'bg-white/50 border border-[#1A1A14]/10 text-[#1A1A14] rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Click-to-Speak list */}
            {isActive && status === 'Listening' && (
              <div className="pt-4 border-t border-[#1A1A14]/10 mt-4">
                <p className="text-[10px] font-semibold text-[#6A6A60] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles size={11} className="text-[#1A1A14]" />
                  Suggested Voice Commands
                </p>
                <div className="flex flex-col gap-1.5">
                  {Object.keys(VOICE_EXCHANGES).map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => submitVoiceQuery(cmd)}
                      className={`text-left text-xs p-2 ${appBtnGhost} !justify-between hover:border-[#1A1A14]/25`}
                    >
                      <span>"{cmd}"</span>
                      <Play size={10} className="text-[#1A1A14]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
