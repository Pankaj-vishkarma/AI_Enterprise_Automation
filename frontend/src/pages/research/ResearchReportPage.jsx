import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { researchAPI } from '../../api/research';
import { ArrowLeft, Download, Loader, Trash2, BookOpen, Link2 } from 'lucide-react';
import { appPageShell, appPageTitle, appPageDesc, appGlassCard, appBtnGhost, appBtnIconDanger, appEmpty, appBadgeInfo } from '../../styles/appStyles';

export default function ResearchReportPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: reportRes, isLoading } = useQuery({
    queryKey: ['research-report', id],
    queryFn: () => researchAPI.get(id),
  });
  const report = reportRes?.data;

  const deleteMutation = useMutation({
    mutationFn: () => researchAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-reports'] });
      window.location.href = '/research';
    },
  });

  const handleDownload = () => {
    if (!report) return;
    const element = document.createElement('a');
    const file = new Blob([report.final_report || ''], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${(report.title || 'report').replace(/\s+/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-16"><Loader className="animate-spin text-[#1A1A14]" size={32} /></div>
      </MainLayout>
    );
  }

  if (!report) {
    return (
      <MainLayout>
        <div className={appEmpty}>
          <p>Report not found.</p>
          <Link to="/research" className="text-[#1A1A14] mt-4 inline-block font-medium hover:underline">Back</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div className="flex items-center gap-3">
          <Link to="/research" className="text-[#6A6A60] hover:text-[#1A1A14] transition p-1 rounded-lg hover:bg-[#1A1A14]/5">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className={appPageTitle}>{report.title}</h1>
            <p className={appPageDesc}>
              <span className={appBadgeInfo}>{report.research_type}</span>
              <span className="mx-2">•</span>
              {report.status}
            </p>
          </div>
          <button onClick={handleDownload} className={`${appBtnGhost} !text-xs !py-2`}>
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => window.confirm('Delete this report?') && deleteMutation.mutate()}
            className={appBtnIconDanger}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {report.summary && (
          <div className={appGlassCard}>
            <h2 className="font-semibold text-sm text-[#1A1A14] mb-2">Executive Summary</h2>
            <p className="text-sm text-[#6A6A60] whitespace-pre-wrap">{report.summary}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className={`${appGlassCard} !p-3`}>
            <p className="text-[#6A6A60]">Confidence</p>
            <p className="font-bold text-[#1A1A14]">{report.confidence_score ?? '—'}%</p>
          </div>
          <div className={`${appGlassCard} !p-3`}>
            <p className="text-[#6A6A60]">Generation Time</p>
            <p className="font-bold text-[#1A1A14]">{report.execution_time_ms ? `${(report.execution_time_ms / 1000).toFixed(1)}s` : '—'}</p>
          </div>
          <div className={`${appGlassCard} !p-3`}>
            <p className="text-[#6A6A60]">Agents Used</p>
            <p className="font-bold text-[#1A1A14]">{(report.agent_usage || []).length}</p>
          </div>
        </div>

        <div className={`${appGlassCard} space-y-3`}>
          <h2 className="font-semibold text-[#1A1A14] flex items-center gap-2"><BookOpen size={18} /> Final Report</h2>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-[#1A1A14] bg-white/50 border border-[#1A1A14]/10 rounded-xl p-4 max-h-[400px] overflow-y-auto">
            {report.final_report}
          </div>
        </div>

        {report.recommendations && (
          <div className={appGlassCard}>
            <h2 className="font-semibold text-sm text-[#1A1A14] mb-2">Recommendations</h2>
            <p className="text-sm text-[#6A6A60] whitespace-pre-wrap">{report.recommendations}</p>
          </div>
        )}

        <div className={`${appGlassCard} space-y-3`}>
          <h2 className="font-semibold text-[#1A1A14] flex items-center gap-2"><Link2 size={18} /> Citations & Sources</h2>
          {(report.citations || []).length === 0 ? (
            <p className="text-sm text-[#6A6A60]">No citations recorded.</p>
          ) : (
            <div className="space-y-2">
              {report.citations.map((c) => (
                <div key={c.id} className="text-xs border border-[#1A1A14]/10 rounded-xl p-3 bg-[#1A1A14]/[0.03]">
                  <p className="font-medium text-[#1A1A14]">[{c.id}] {c.reference}</p>
                  <p className="text-[#6A6A60] mt-1">{c.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {(report.intermediate_findings || []).length > 0 && (
          <div className={`${appGlassCard} space-y-3`}>
            <h2 className="font-semibold text-[#1A1A14]">Agent Pipeline</h2>
            {report.intermediate_findings.map((step, i) => (
              <div key={i} className="border border-[#1A1A14]/10 rounded-xl p-3 text-xs">
                <p className="font-semibold text-[#1A1A14]">{step.agent_name} {step.employee_name ? `(${step.employee_name})` : ''} — {step.status}</p>
                <p className="text-[#6A6A60] mt-1 whitespace-pre-wrap line-clamp-4">{step.output}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
