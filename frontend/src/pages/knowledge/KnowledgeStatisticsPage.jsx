import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import KnowledgeNav from '../../components/knowledge/KnowledgeNav';
import { knowledgeAPI } from '../../api/knowledge';
import { Loader } from 'lucide-react';
import { appPageShell, appPageTitle, appPageDesc, appGlassCard, appEmpty } from '../../styles/appStyles';

export default function KnowledgeStatisticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-statistics'],
    queryFn: () => knowledgeAPI.getStatistics(),
  });
  const stats = data?.data || {};

  return (
    <MainLayout>
      <div className={appPageShell}>
        <h1 className={appPageTitle}>Knowledge Statistics</h1>
        <p className={appPageDesc}>Usage, gaps, and document coverage across your knowledge base.</p>
        <KnowledgeNav />
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader className="animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={appGlassCard}>
              <p className="text-xs text-[#6A6A60]">Total Documents</p>
              <p className="text-2xl font-bold">{stats.total_documents ?? 0}</p>
            </div>
            <div className={appGlassCard}>
              <p className="text-xs text-[#6A6A60]">Total Queries</p>
              <p className="text-2xl font-bold">{stats.total_queries ?? 0}</p>
            </div>
            <div className={`${appGlassCard} md:col-span-2`}>
              <h3 className="text-sm font-bold mb-3">Most Searched Topics</h3>
              {(stats.most_searched_topics || []).length === 0 ? (
                <div className={appEmpty}>No search topics yet.</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {stats.most_searched_topics.map((topic, idx) => (
                    <li key={idx} className="flex justify-between border-b border-[#1A1A14]/10 py-2">
                      <span className="truncate mr-4">{topic.topic || topic.question}</span>
                      <span className="font-bold">{topic.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={`${appGlassCard} md:col-span-2`}>
              <h3 className="text-sm font-bold mb-3">Knowledge Gaps</h3>
              {(stats.knowledge_gaps || []).length === 0 ? (
                <div className={appEmpty}>No knowledge gaps detected.</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {stats.knowledge_gaps.map((gap, idx) => (
                    <li key={idx} className="flex justify-between border-b border-[#1A1A14]/10 py-2">
                      <span className="truncate mr-4">{gap.topic || gap.question}</span>
                      <span className="font-bold">{gap.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
