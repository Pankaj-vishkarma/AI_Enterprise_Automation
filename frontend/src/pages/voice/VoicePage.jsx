import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { Mic, MicOff, Loader, MessageSquare, Volume2, Sparkles, AlertCircle, Play } from 'lucide-react';

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

  const toggleSession = () => {
    if (isActive) {
      setIsActive(false);
      setStatus('Offline');
      setConversations([]);
    } else {
      setIsActive(true);
      setStatus('Connecting');
      setTimeout(() => {
        setStatus('Listening');
        setConversations([
          { type: 'ai', text: "Voice Assistant connected. I have access to your organization's knowledge base. What can I help you with?" }
        ]);
      }, 1000);
    }
  };

  const simulateSpeechInput = (queryText) => {
    if (!isActive || status !== 'Listening') return;

    // Set status to user speaking / AI thinking
    setStatus('Thinking');
    setConversations(prev => [...prev, { type: 'user', text: queryText }]);

    setTimeout(() => {
      setStatus('Speaking');
      const answer = VOICE_EXCHANGES[queryText] || {
        user: queryText,
        ai: "I've searched the database regarding your request but could not find a matching policy. Let me search the web or route to a human colleague."
      };

      setConversations(prev => [...prev, { type: 'ai', text: answer.ai }]);

      // Set back to listening after 3 seconds of speaking simulation
      setTimeout(() => {
        setStatus('Listening');
      }, 3500);
    }, 1200);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Mic size={32} className="text-primary" />
            Voice AI Platform
          </h1>
          <p className="text-muted-foreground mt-1">Interact with your organization's knowledge base and support tickets using natural voice commands.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Wave Visualizer & Controller Column */}
          <div className="md:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col justify-between items-center shadow-sm">
            <div className="text-center w-full space-y-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                status === 'Listening' ? 'bg-green-100 text-green-800' :
                status === 'Speaking' ? 'bg-blue-100 text-blue-800' :
                status === 'Thinking' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  status === 'Listening' ? 'bg-green-600 animate-ping' :
                  status === 'Speaking' ? 'bg-blue-600 animate-bounce' :
                  status === 'Thinking' ? 'bg-yellow-500 animate-pulse' :
                  'bg-gray-500'
                }`} />
                {status}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Voice Session Status</p>
            </div>

            {/* Pulsing Audio Wave Visualizer */}
            <div className="h-40 flex items-center justify-center w-full relative">
              {isActive && status === 'Listening' && (
                <div className="flex gap-1.5 items-center justify-center">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-primary rounded-full animate-[pulse_1s_infinite]" 
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
                      className="w-1.5 bg-accent rounded-full animate-bounce" 
                      style={{ 
                        height: `${Math.random() * 80 + 20}px`,
                        animationDelay: `${i * 0.08}s`
                      }} 
                    />
                  ))}
                </div>
              )}

              {isActive && status === 'Thinking' && (
                <Loader className="animate-spin text-primary" size={32} />
              )}

              {!isActive && (
                <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
                  <MicOff size={28} />
                </div>
              )}
            </div>

            {/* Start/Stop Button */}
            <button
              onClick={toggleSession}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition cursor-pointer text-sm shadow-sm ${
                isActive
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/95'
                  : 'bg-primary text-primary-foreground hover:bg-primary/95'
              }`}
            >
              {isActive ? <MicOff size={16} /> : <Mic size={16} />}
              {isActive ? 'Disconnect Session' : 'Start Voice Session'}
            </button>
          </div>

          {/* Transcript & Suggested Commands Column */}
          <div className="md:col-span-2 flex flex-col justify-between border border-border rounded-xl bg-card p-6 shadow-sm overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="border-b border-border pb-3 mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-primary" />
                  Live Voice Transcript Log
                </h3>
              </div>

              {/* Transcript list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 select-text scrollbar-thin max-h-72">
                {conversations.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    Start a session to capture real-time speech-to-text transcriptions.
                  </div>
                ) : (
                  conversations.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.type === 'ai' && (
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                          <Volume2 size={14} />
                        </div>
                      )}
                      <div className={`max-w-md p-3 rounded-lg text-xs leading-relaxed ${
                        msg.type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-secondary text-secondary-foreground rounded-tl-none border border-border'
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
              <div className="pt-4 border-t border-border mt-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles size={11} className="text-primary" />
                  Simulate Saying a Command
                </p>
                <div className="flex flex-col gap-1.5">
                  {Object.keys(VOICE_EXCHANGES).map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => simulateSpeechInput(cmd)}
                      className="text-left text-xs p-2 bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary rounded-lg transition text-foreground cursor-pointer flex items-center justify-between"
                    >
                      <span>"{cmd}"</span>
                      <Play size={10} className="text-primary" />
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
