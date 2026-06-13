import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import KnowledgeNav from '../../components/knowledge/KnowledgeNav';
import { knowledgeAPI } from '../../api/knowledge';
import { Search, Loader } from 'lucide-react';
import {
  appPageShell, appPageTitle, appPageDesc, appGlassCard, appBtnPrimary,
  appInputPlain, appEmpty, appLabel,
} from '../../styles/appStyles';

export default function KnowledgeSearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['knowledge-search', submitted],
    queryFn: () => knowledgeAPI.search(submitted, { top_k: 8 }),
    enabled: Boolean(submitted),
  });

  const result = data?.data;

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) setSubmitted(query.trim());
  };

  return (
    <MainLayout>
      <div className={appPageShell}>
        <h1 className={appPageTitle}>Knowledge Search</h1>
        <p className={appPageDesc}>Semantic search across your organization&apos;s knowledge base.</p>
        <KnowledgeNav />
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            className={`${appInputPlain} flex-1`}
            placeholder="Ask a question, e.g. What is the reimbursement policy?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className={appBtnPrimary}>
            <Search size={16} /> Search
          </button>
        </form>
        {(isLoading || isFetching) && (
          <div className="flex justify-center py-8"><Loader className="animate-spin" /></div>
        )}
        {submitted && !isLoading && !result && (
          <div className={appEmpty}>No results found.</div>
        )}
        {result && (
          <div className="space-y-4">
            <div className={appGlassCard}>
              <p className={appLabel}>Answer</p>
              <p className="text-sm text-[#1A1A14] whitespace-pre-wrap">{result.answer_text}</p>
            </div>
            {(result.matched_chunks || []).length > 0 && (
              <div className={appGlassCard}>
                <p className={appLabel}>Matched Sources</p>
                <div className="space-y-3 mt-2">
                  {result.matched_chunks.map((chunk) => (
                    <div key={chunk.id} className="p-3 rounded-xl border border-[#1A1A14]/10 text-xs">
                      <p className="font-semibold mb-1">Chunk #{chunk.chunk_index}</p>
                      <p className="text-[#4B4B42] line-clamp-4">{chunk.chunk_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
