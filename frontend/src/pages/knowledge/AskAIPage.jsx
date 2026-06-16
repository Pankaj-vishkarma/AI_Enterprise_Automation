import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import KnowledgeNav from '../../components/knowledge/KnowledgeNav';
import { knowledgeAPI } from '../../api/knowledge';
import { Send, Loader, Bot, User, HelpCircle, Sparkles } from 'lucide-react';
import { appPageShellTall, appPageTitle, appPageDesc, appGlassCard, appInputPlain, appBtnPrimary, appBtnGhost } from '../../styles/appStyles';

const SUGGESTED_QUESTIONS = [
  "What is the reimbursement policy?",
  "How many annual leaves are allowed?",
  "What is the customer refund process?",
  "What is the probation period?"
];

const KNOWLEDGE_HISTORY_QUERY_KEY = ['knowledge-history'];
const KNOWLEDGE_STATISTICS_QUERY_KEY = ['knowledge-statistics'];

export default function AskAIPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your Knowledge Intelligence Assistant. Ask me anything about your uploaded employee handbooks, company policies, SOPs, or documentation, and I will find the answers based on your business data.",
    },
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const askQuestion = async (questionText) => {
    if (!questionText.trim()) return;

    const userMessage = { id: Date.now(), type: 'user', content: questionText };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await knowledgeAPI.createQuery({ question_text: questionText, top_k: 5 });
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: res.data.answer_text || "I couldn't find a matching record in the knowledge base. Please check if appropriate files are uploaded.",
      };
      setMessages((prev) => [...prev, aiMessage]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: KNOWLEDGE_HISTORY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: KNOWLEDGE_STATISTICS_QUERY_KEY }),
      ]);
    } catch (err) {
      console.error('Error submitting query', err);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Failed to contact the knowledge service. Please verify that documents have been uploaded and database tables are active.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading || !query.trim()) return;
    askQuestion(query);
    setQuery('');
  };

  return (
    <MainLayout>
      <div className={appPageShellTall}>
        <div className="mb-4 flex-shrink-0">
          <h1 className={`${appPageTitle} flex items-center gap-2`}>
            <Sparkles className="text-[#1A1A14]" size={24} />
            Knowledge Intelligence
          </h1>
          <p className={appPageDesc}>Query your uploaded business knowledge base using natural language AI</p>
          <KnowledgeNav />
        </div>

        <div className={`flex-1 ${appGlassCard} overflow-y-auto mb-4 !p-4 sm:!p-6 space-y-4 min-h-0`}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.type === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="text-[#1A1A14]" size={18} />
                </div>
              )}
              <div
                className={`max-w-xl px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  msg.type === 'user'
                    ? 'bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] rounded-tr-none'
                    : 'bg-white/50 border border-[#1A1A14]/10 text-[#1A1A14] rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
              {msg.type === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] flex items-center justify-center flex-shrink-0">
                  <User size={18} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center flex-shrink-0">
                <Bot className="text-[#1A1A14]" size={18} />
              </div>
              <div className="bg-white/50 border border-[#1A1A14]/10 text-[#6A6A60] px-4 py-3 rounded-xl rounded-tl-none flex items-center gap-2 text-sm">
                <Loader className="animate-spin text-[#1A1A14]" size={16} />
                Analyzing knowledge base documents...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && !isLoading && (
          <div className="mb-4 flex-shrink-0">
            <p className="text-xs font-semibold text-[#6A6A60] uppercase tracking-wider mb-2 flex items-center gap-1">
              <HelpCircle size={14} />
              Suggested Questions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => askQuestion(q)}
                  className={`${appBtnGhost} !justify-start text-left text-sm !py-3`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask something about reimbursement, leaves, refund, policies..."
            disabled={isLoading}
            className={`flex-1 ${appInputPlain} disabled:opacity-50`}
          />
          <button type="submit" disabled={isLoading || !query.trim()} className={`${appBtnPrimary} sm:flex-shrink-0`}>
            <Send size={18} />
            Ask AI
          </button>
        </form>
      </div>
    </MainLayout>
  );
}
