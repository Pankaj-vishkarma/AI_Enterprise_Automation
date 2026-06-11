import React, { useState, useRef, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { knowledgeAPI } from '../../api/knowledge';
import { Send, Loader, Bot, User, HelpCircle, Sparkles } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "What is the reimbursement policy?",
  "How many annual leaves are allowed?",
  "What is the customer refund process?",
  "What is the probation period?"
];

export default function AskAIPage() {
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

  // Auto scroll to bottom of chat
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
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="text-primary" size={28} />
            Knowledge Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">Query your uploaded business knowledge base using natural language AI</p>
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-y-auto mb-4 p-6 space-y-4 shadow-sm">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.type === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="text-primary" size={18} />
                </div>
              )}
              <div
                className={`max-w-xl px-4 py-3 rounded-xl shadow-sm text-sm leading-relaxed ${
                  msg.type === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-secondary text-secondary-foreground rounded-tl-none border border-border'
                }`}
              >
                {msg.content}
              </div>
              {msg.type === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <User size={18} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="text-primary" size={18} />
              </div>
              <div className="bg-secondary text-secondary-foreground px-4 py-3 rounded-xl rounded-tl-none border border-border flex items-center gap-2 text-sm">
                <Loader className="animate-spin text-primary" size={16} />
                Analyzing knowledge base documents...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion list */}
        {messages.length === 1 && !isLoading && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <HelpCircle size={14} />
              Suggested Questions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => askQuestion(q)}
                  className="text-left text-sm p-3 bg-card border border-border hover:border-primary/50 hover:bg-secondary/40 rounded-xl transition cursor-pointer text-foreground shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask something about reimbursement, leaves, refund, policies..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-border rounded-xl bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 text-sm shadow-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition cursor-pointer shadow-sm"
          >
            <Send size={18} />
            Ask AI
          </button>
        </form>
      </div>
    </MainLayout>
  );
}
