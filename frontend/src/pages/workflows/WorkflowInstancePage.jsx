import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { workflowsAPI } from '../../api/workflows';
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, Loader, AlertTriangle,
  Ban, MessageSquare,
} from 'lucide-react';
import { appPageShell, appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appInputPlain, appBtnPrimary, appError, appEmpty, appBadgeActive, appBadgeWarning, appBadgeInfo, appBadgeError } from '../../styles/appStyles';

export default function WorkflowInstancePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [errorText, setErrorText] = useState('');

  const { data: instanceRes, isLoading } = useQuery({
    queryKey: ['workflow-instance', id],
    queryFn: () => workflowsAPI.getInstance(id),
  });
  const instance = instanceRes?.data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow-instance', id] });
    queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-metrics'] });
  };

  const approveMutation = useMutation({
    mutationFn: (stepId) => workflowsAPI.approveStep(id, stepId, comment || null),
    onSuccess: () => { invalidate(); setComment(''); setErrorText(''); },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Approval failed'),
  });
  const rejectMutation = useMutation({
    mutationFn: (stepId) => workflowsAPI.rejectStep(id, stepId, comment || null),
    onSuccess: () => { invalidate(); setComment(''); setErrorText(''); },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Rejection failed'),
  });
  const cancelMutation = useMutation({
    mutationFn: () => workflowsAPI.cancelInstance(id),
    onSuccess: invalidate,
    onError: (err) => setErrorText(err.response?.data?.detail || 'Cancel failed'),
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-16"><Loader className="animate-spin text-[#1A1A14]" size={32} /></div>
      </MainLayout>
    );
  }

  if (!instance) {
    return (
      <MainLayout>
        <div className={appEmpty}>
          <p>Workflow instance not found.</p>
          <Link to="/workflows" className="text-[#1A1A14] mt-4 inline-block font-medium hover:underline">Back</Link>
        </div>
      </MainLayout>
    );
  }

  const statusIcon = {
    completed: <CheckCircle2 className="text-emerald-600" size={20} />,
    in_progress: <Clock className="text-[#1A1A14] animate-pulse" size={20} />,
    rejected: <XCircle className="text-red-600" size={20} />,
    cancelled: <Ban className="text-[#6A6A60]" size={20} />,
  }[instance.status] || <AlertTriangle className="text-amber-600" size={20} />;

  const stepBadgeClass = (stepStatus) => {
    if (stepStatus === 'approved') return appBadgeActive;
    if (stepStatus === 'pending') return appBadgeWarning;
    if (stepStatus === 'rejected') return appBadgeError;
    return appBadgeInfo;
  };

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div className="flex items-center gap-3">
          <Link to="/workflows" className="text-[#6A6A60] hover:text-[#1A1A14] transition p-1 rounded-lg hover:bg-[#1A1A14]/5">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className={`${appPageTitle} !text-xl sm:!text-2xl`}>{instance.title}</h1>
            <p className={appPageDesc}>
              {instance.workflow_name} • {instance.status.replace('_', ' ')}
            </p>
          </div>
          {statusIcon}
        </div>

        {errorText && (
          <div className={appError}>{errorText}</div>
        )}

        <div className={appGlassCard}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#1A1A14]">Progress</span>
            <span className="text-sm font-bold text-[#1A1A14]">{instance.progress_percent}%</span>
          </div>
          <div className="w-full bg-[#1A1A14]/10 rounded-full h-2">
            <div className="bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] h-2 rounded-full transition-all" style={{ width: `${instance.progress_percent}%` }} />
          </div>
        </div>

        <div className={`${appGlassCard} space-y-4`}>
          <h2 className={appSectionTitle}>Workflow Timeline</h2>
          <div className="space-y-3">
            {(instance.steps || []).map((step, index) => (
              <div key={step.id} className="flex gap-4 items-start p-4 border border-[#1A1A14]/10 rounded-xl bg-white/30">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step.status === 'approved' ? 'bg-emerald-600 text-white'
                    : step.status === 'pending' ? 'bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3]'
                    : step.status === 'rejected' ? 'bg-red-600 text-white'
                    : 'bg-[#1A1A14]/10 text-[#6A6A60] border border-[#1A1A14]/10'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-sm text-[#1A1A14]">{step.name}</p>
                      <p className="text-xs text-[#6A6A60]">
                        {step.step_type} • {step.assignee_label || 'Unassigned'}
                      </p>
                    </div>
                    <span className={`${stepBadgeClass(step.status)} capitalize`}>{step.status}</span>
                  </div>
                  {step.comments && <p className="text-xs text-[#6A6A60] italic">{step.comments}</p>}
                  {step.ai_output && (
                    <p className="text-xs text-[#1A1A14] bg-white/50 border border-[#1A1A14]/10 p-2 rounded-xl whitespace-pre-wrap">{step.ai_output}</p>
                  )}
                  {step.status === 'pending' && instance.status === 'in_progress' && (
                    <div className="flex gap-2 pt-2">
                      <input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Optional comment..."
                        className={`flex-1 text-xs !py-1.5 !px-2 ${appInputPlain}`}
                      />
                      <button
                        onClick={() => approveMutation.mutate(step.id)}
                        disabled={approveMutation.isPending}
                        className={`text-xs !px-3 !py-1.5 ${appBtnPrimary}`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(step.id)}
                        disabled={rejectMutation.isPending}
                        className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-xl font-semibold bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {instance.status === 'in_progress' && (
          <button
            onClick={() => window.confirm('Cancel this workflow?') && cancelMutation.mutate()}
            className="text-sm text-red-600 hover:underline flex items-center gap-1"
          >
            <Ban size={14} /> Cancel Workflow
          </button>
        )}

        <div className={`${appGlassCard} space-y-3`}>
          <h2 className={`${appSectionTitle} flex items-center gap-2`}><MessageSquare size={18} /> Audit Trail</h2>
          {(instance.audit_logs || []).length === 0 ? (
            <p className="text-sm text-[#6A6A60]">No audit entries yet.</p>
          ) : (
            instance.audit_logs.map((log) => (
              <div key={log.id} className="text-sm border-b border-[#1A1A14]/10 pb-2 last:border-0">
                <span className="font-medium text-[#1A1A14]">{log.action}</span>
                {log.message && <span className="text-[#6A6A60]"> — {log.message}</span>}
                {log.created_at && (
                  <span className="block text-xs text-[#6A6A60] mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
