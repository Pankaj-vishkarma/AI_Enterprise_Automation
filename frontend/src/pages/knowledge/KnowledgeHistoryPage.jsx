import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import KnowledgeNav from '../../components/knowledge/KnowledgeNav';
import { knowledgeAPI } from '../../api/knowledge';
import { Loader } from 'lucide-react';
import { appPageShell, appPageTitle, appPageDesc, appGlassCard, appEmpty } from '../../styles/appStyles';

export default function KnowledgeHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-history'],
    queryFn: () => knowledgeAPI.listQueries(),
  });
  const history = data?.data || [];

  return (
    <MainLayout>
      <div className={appPageShell}>
        <h1 className={appPageTitle}>Query History</h1>
        <p className={appPageDesc}>Past knowledge questions and answers in your organization.</p>
        <KnowledgeNav />
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader className="animate-spin" /></div>
        ) : history.length === 0 ? (
          <div className={appEmpty}>No query history yet.</div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className={appGlassCard}>
                <p className="text-sm font-semibold text-[#1A1A14]">{item.question_text}</p>
                <p className="text-xs text-[#6A6A60] mt-2 whitespace-pre-wrap line-clamp-4">{item.answer_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
