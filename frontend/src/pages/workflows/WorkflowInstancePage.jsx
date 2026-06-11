import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { workflowsAPI } from '../../api/workflows';
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, Loader, AlertTriangle,
  Ban, MessageSquare,
} from 'lucide-react';

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
        <div className="flex justify-center py-16"><Loader className="animate-spin text-primary" size={32} /></div>
      </MainLayout>
    );
  }

  if (!instance) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Workflow instance not found.</p>
          <Link to="/workflows" className="text-primary mt-4 inline-block hover:underline">Back</Link>
        </div>
      </MainLayout>
    );
  }

  const statusIcon = {
    completed: <CheckCircle2 className="text-green-600" size={20} />,
    in_progress: <Clock className="text-primary animate-pulse" size={20} />,
    rejected: <XCircle className="text-red-600" size={20} />,
    cancelled: <Ban className="text-muted-foreground" size={20} />,
  }[instance.status] || <AlertTriangle className="text-amber-600" size={20} />;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/workflows" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{instance.title}</h1>
            <p className="text-sm text-muted-foreground">
              {instance.workflow_name} • {instance.status.replace('_', ' ')}
            </p>
          </div>
          {statusIcon}
        </div>

        {errorText && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorText}</div>
        )}

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm font-bold">{instance.progress_percent}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${instance.progress_percent}%` }} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Workflow Timeline</h2>
          <div className="space-y-3">
            {(instance.steps || []).map((step, index) => (
              <div key={step.id} className="flex gap-4 items-start p-4 border border-border rounded-lg bg-secondary/20">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step.status === 'approved' ? 'bg-green-600 text-white'
                    : step.status === 'pending' ? 'bg-primary text-white'
                    : step.status === 'rejected' ? 'bg-red-600 text-white'
                    : 'bg-secondary text-muted-foreground border border-border'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{step.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {step.step_type} • {step.assignee_label || 'Unassigned'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary capitalize">{step.status}</span>
                  </div>
                  {step.comments && <p className="text-xs text-muted-foreground italic">{step.comments}</p>}
                  {step.ai_output && (
                    <p className="text-xs text-foreground bg-input p-2 rounded border border-border whitespace-pre-wrap">{step.ai_output}</p>
                  )}
                  {step.status === 'pending' && instance.status === 'in_progress' && (
                    <div className="flex gap-2 pt-2">
                      <input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Optional comment..."
                        className="flex-1 text-xs px-2 py-1.5 border border-border rounded-lg bg-input"
                      />
                      <button
                        onClick={() => approveMutation.mutate(step.id)}
                        disabled={approveMutation.isPending}
                        className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(step.id)}
                        disabled={rejectMutation.isPending}
                        className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
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

        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2"><MessageSquare size={18} /> Audit Trail</h2>
          {(instance.audit_logs || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            instance.audit_logs.map((log) => (
              <div key={log.id} className="text-sm border-b border-border pb-2 last:border-0">
                <span className="font-medium text-foreground">{log.action}</span>
                {log.message && <span className="text-muted-foreground"> — {log.message}</span>}
                {log.created_at && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
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
