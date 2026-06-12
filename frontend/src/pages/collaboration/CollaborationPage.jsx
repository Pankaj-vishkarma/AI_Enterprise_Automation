import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { collaborationAPI } from '../../api/collaboration';
import { aiEmployeesAPI } from '../../api/aiEmployees';
import {
  GitMerge, Play, Loader, FileText, CheckCircle2, XCircle, Download,
  Plus, Trash2, Edit, BarChart3, History, Users, X, AlertTriangle,
} from 'lucide-react';
import {
  appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appCard, appCardPadding,
  appInputPlain, appBtnPrimary, appBtnGhost, appBtnIconPrimary, appBtnIconDanger,
  appTableWrap, appTr, appError, appEmpty, appTabActive, appTabInactive, appLabel,
  appModalOverlay, appBadgeActive, appBadgeWarning, appBadgeError, appBadgeInfo,
} from '../../styles/appStyles';

const emptyTeamForm = { id: null, name: '', description: '', memberIds: [] };

export default function CollaborationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('run');
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [prompt, setPrompt] = useState('Create a market research report about electric vehicles.');
  const [runResult, setRunResult] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [errorText, setErrorText] = useState('');

  const { data: teamsRes, isLoading: teamsLoading } = useQuery({
    queryKey: ['collaboration-teams'],
    queryFn: () => collaborationAPI.listTeams(),
  });
  const { data: employeesRes } = useQuery({
    queryKey: ['ai-employees'],
    queryFn: () => aiEmployeesAPI.list(),
  });
  const { data: runsRes } = useQuery({
    queryKey: ['collaboration-runs'],
    queryFn: () => collaborationAPI.listRuns({ limit: 50 }),
    enabled: activeTab === 'history' || activeTab === 'metrics',
  });
  const { data: metricsRes } = useQuery({
    queryKey: ['collaboration-metrics'],
    queryFn: () => collaborationAPI.getMetrics(),
    enabled: activeTab === 'metrics',
  });
  const { data: runDetailRes } = useQuery({
    queryKey: ['collaboration-run', selectedRunId],
    queryFn: () => collaborationAPI.getRun(selectedRunId),
    enabled: !!selectedRunId,
  });

  const teams = teamsRes?.data || [];
  const employees = (employeesRes?.data || []).filter((e) => e.status === 'Active');
  const runs = runsRes?.data || [];
  const metrics = metricsRes?.data || {};
  const runDetail = runDetailRes?.data;

  React.useEffect(() => {
    if (teams.length && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const invalidateTeams = () => queryClient.invalidateQueries({ queryKey: ['collaboration-teams'] });
  const invalidateRuns = () => {
    queryClient.invalidateQueries({ queryKey: ['collaboration-runs'] });
    queryClient.invalidateQueries({ queryKey: ['collaboration-metrics'] });
  };

  const runMutation = useMutation({
    mutationFn: () => collaborationAPI.run(selectedTeamId, prompt),
    onSuccess: (res) => {
      setRunResult(res.data);
      setErrorText('');
      invalidateRuns();
    },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Collaboration run failed'),
  });

  const saveTeamMutation = useMutation({
    mutationFn: () => {
      const members = teamForm.memberIds.map((id, index) => ({
        ai_employee_id: Number(id),
        position: index,
      }));
      const payload = {
        name: teamForm.name,
        description: teamForm.description || null,
        members,
      };
      return teamForm.id
        ? collaborationAPI.updateTeam(teamForm.id, payload)
        : collaborationAPI.createTeam(payload);
    },
    onSuccess: () => {
      invalidateTeams();
      setIsTeamModalOpen(false);
      setTeamForm(emptyTeamForm);
      setErrorText('');
    },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Unable to save team'),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id) => collaborationAPI.deleteTeam(id),
    onSuccess: () => {
      invalidateTeams();
      if (selectedTeamId === teamForm.id) setSelectedTeamId(null);
    },
  });

  const openTeamForm = (team = null) => {
    if (team) {
      setTeamForm({
        id: team.id,
        name: team.name,
        description: team.description || '',
        memberIds: (team.members || []).sort((a, b) => a.position - b.position).map((m) => m.ai_employee_id),
      });
    } else {
      setTeamForm({ ...emptyTeamForm, memberIds: [] });
    }
    setErrorText('');
    setIsTeamModalOpen(true);
  };

  const toggleMember = (empId) => {
    setTeamForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(empId)
        ? prev.memberIds.filter((id) => id !== empId)
        : [...prev.memberIds, empId],
    }));
  };

  const handleDownload = (content, filename) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const tabs = [
    { id: 'run', label: 'Run Collaboration', icon: Play },
    { id: 'teams', label: 'Team Builder', icon: Users },
    { id: 'history', label: 'History', icon: History },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  const displayRun = runResult || runDetail;
  const logs = displayRun?.intermediate_outputs || [];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className={`${appPageTitle} flex items-center gap-2`}>
            <GitMerge size={32} className="text-[#1A1A14]" />
            Multi-Agent Collaboration Studio
          </h1>
          <p className={appPageDesc}>
            Orchestrate real AI employees into teams for complex, multi-step business objectives.
          </p>
        </div>

        <div className="flex gap-2 border-b border-[#1A1A14]/10 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedRunId(null); setRunResult(null); }}
                className={`px-4 py-2 text-sm ${activeTab === tab.id ? appTabActive : appTabInactive}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {errorText && (
          <div className={appError}>
            {errorText}
          </div>
        )}

        {activeTab === 'run' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className={`${appGlassCard} space-y-4`}>
                <h2 className={appSectionTitle}>Select Team</h2>
                {teamsLoading ? (
                  <Loader className="animate-spin text-[#1A1A14]" size={20} />
                ) : teams.length === 0 ? (
                  <div className="text-sm text-[#6A6A60] space-y-2">
                    <p>No teams yet.</p>
                    <button
                      onClick={() => { setActiveTab('teams'); openTeamForm(); }}
                      className="text-[#1A1A14] font-semibold hover:underline text-sm"
                    >
                      Create your first team →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeamId(team.id)}
                        disabled={runMutation.isPending}
                        className={`w-full text-left p-3 rounded-xl border transition text-sm ${
                          selectedTeamId === team.id
                            ? 'border-[#1A1A14] bg-[#1A1A14]/5 font-semibold text-[#1A1A14]'
                            : 'border-[#1A1A14]/10 bg-white/50 hover:bg-[#1A1A14]/[0.03] text-[#1A1A14]'
                        }`}
                      >
                        {team.name}
                        <span className="block text-xs text-[#6A6A60] mt-0.5">
                          {team.member_count} member(s)
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedTeam && (
                <div className={`${appGlassCard} space-y-3`}>
                  <h2 className={appSectionTitle}>Team Members</h2>
                  <div className="space-y-3">
                    {(selectedTeam.members || []).map((member, i) => (
                      <div key={member.id} className="flex gap-3 items-start p-2.5 rounded-xl bg-[#1A1A14]/[0.04] border border-[#1A1A14]/10">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A14]/10 border border-[#1A1A14]/20 flex items-center justify-center flex-shrink-0 text-[#1A1A14] font-bold text-xs">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1A1A14]">{member.employee_name}</p>
                          <p className="text-xs text-[#6A6A60] font-medium">{member.employee_role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className={`${appGlassCard} space-y-4`}>
                <h2 className={appSectionTitle}>Task Request</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={runMutation.isPending}
                    placeholder="Describe the collaboration objective..."
                    className={`flex-1 ${appInputPlain}`}
                  />
                  <button
                    onClick={() => selectedTeamId && runMutation.mutate()}
                    disabled={runMutation.isPending || !prompt.trim() || !selectedTeamId}
                    className={appBtnPrimary}
                  >
                    {runMutation.isPending ? <Loader className="animate-spin" size={16} /> : <Play size={16} />}
                    Run Team
                  </button>
                </div>
              </div>

              {(runMutation.isPending || displayRun) && (
                <div className={`${appGlassCard} space-y-6`}>
                  <div className="flex justify-between items-center">
                    <h2 className={`${appSectionTitle} flex items-center gap-2`}>
                      {runMutation.isPending && <Loader className="animate-spin text-[#1A1A14]" size={20} />}
                      {displayRun?.status === 'completed' && <CheckCircle2 className="text-emerald-600" size={20} />}
                      {displayRun?.status === 'failed' && <XCircle className="text-red-600" size={20} />}
                      {displayRun?.status === 'partial' && <AlertTriangle className="text-amber-600" size={20} />}
                      Agent Timeline
                    </h2>
                    {displayRun?.final_output && (
                      <button
                        onClick={() => handleDownload(displayRun.final_output, 'collaboration_report.md')}
                        className={`${appBtnGhost} text-xs py-1.5 px-3`}
                      >
                        <Download size={14} />
                        Export
                      </button>
                    )}
                  </div>

                  {displayRun?.failure_info && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                      <strong>Failure at {displayRun.failure_info.employee_name}:</strong>{' '}
                      {displayRun.failure_info.reason}
                    </div>
                  )}

                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#1A1A14]/10">
                    {logs.map((log, index) => (
                      <div key={index} className="flex gap-4 items-start relative pl-1">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs z-10 flex-shrink-0 ${
                          log.status === 'completed'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-red-600 border-red-600 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="bg-white/50 border border-[#1A1A14]/10 rounded-xl p-4 flex-1 space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-sm text-[#1A1A14]">
                              {log.employee_name} ({log.employee_role})
                            </h4>
                            <span className={appBadgeInfo}>
                              {log.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#6A6A60] leading-relaxed whitespace-pre-wrap">{log.output}</p>
                          <div className="flex gap-3 text-[11px] text-[#6A6A60]">
                            {log.execution_time_ms != null && <span>{log.execution_time_ms}ms</span>}
                            {(log.tools_used || []).length > 0 && <span>Tools: {log.tools_used.join(', ')}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {runMutation.isPending && (
                      <div className="flex gap-4 items-center pl-1 text-sm text-[#6A6A60] italic">
                        <Loader className="animate-spin" size={16} />
                        Agents collaborating via LangGraph...
                      </div>
                    )}
                  </div>

                  {displayRun?.final_output && (
                    <div className="border-t border-[#1A1A14]/10 pt-6 space-y-4">
                      <h3 className="font-bold text-[#1A1A14] flex items-center gap-1.5">
                        <FileText size={18} className="text-[#1A1A14]" />
                        Final Report
                        {displayRun.execution_time_ms && (
                          <span className="text-xs text-[#6A6A60] font-normal ml-2">
                            {displayRun.execution_time_ms}ms total
                          </span>
                        )}
                      </h3>
                      <div className="bg-white/50 border border-[#1A1A14]/10 rounded-xl p-5 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto text-[#1A1A14]">
                        {displayRun.final_output}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className={appSectionTitle}>Collaboration Teams</h2>
              <button
                onClick={() => openTeamForm()}
                className={appBtnPrimary}
              >
                <Plus size={16} />
                Create Team
              </button>
            </div>
            {teams.length === 0 ? (
              <div className={`${appGlassCard} ${appEmpty}`}>
                No teams created. Assign AI employees to build a collaboration workflow.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => (
                  <div key={team.id} className={`${appGlassCard} space-y-3`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-[#1A1A14]">{team.name}</h3>
                        <p className="text-sm text-[#6A6A60] mt-1">{team.description || 'No description'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openTeamForm(team)} className={appBtnIconPrimary}>
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => window.confirm('Delete this team?') && deleteTeamMutation.mutate(team.id)}
                          className={appBtnIconDanger}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(team.members || []).map((m, i) => (
                        <span key={m.id} className={appBadgeInfo}>
                          {i + 1}. {m.employee_name} ({m.employee_role})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className={appSectionTitle}>Collaboration History</h2>
            {runs.length === 0 ? (
              <div className={`${appGlassCard} ${appEmpty}`}>
                No collaboration runs yet.
              </div>
            ) : (
              <div className={appTableWrap}>
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => { setSelectedRunId(run.id); setRunResult(null); setActiveTab('run'); }}
                    className={`${appTr} w-full text-left block p-5 space-y-1`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <p className="font-medium text-[#1A1A14] text-sm">{run.task}</p>
                      <span className={`flex-shrink-0 ${
                        run.status === 'completed' ? appBadgeActive
                          : run.status === 'partial' ? appBadgeWarning
                          : appBadgeError
                      }`}>
                        {run.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#6A6A60]">
                      {run.team_name} • {run.created_at ? new Date(run.created_at).toLocaleString() : ''}
                      {run.execution_time_ms != null && ` • ${run.execution_time_ms}ms`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`${appGlassCard} space-y-4`}>
              <h3 className={appSectionTitle}>Run Statistics</h3>
              {[
                ['Total Runs', metrics.total_runs ?? 0],
                ['Successful', metrics.successful_runs ?? 0],
                ['Failed', metrics.failed_runs ?? 0],
                ['Partial', metrics.partial_runs ?? 0],
                ['Success Rate', `${metrics.success_rate ?? 0}%`],
                ['Avg Execution', metrics.average_execution_time_ms ? `${metrics.average_execution_time_ms}ms` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-[#1A1A14]/[0.06] pb-2 last:border-b-0 last:pb-0">
                  <span className="text-[#6A6A60]">{label}</span>
                  <span className="font-medium text-[#1A1A14]">{value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className={`${appGlassCard} space-y-3`}>
                <h3 className={appSectionTitle}>Most Used Teams</h3>
                {(metrics.most_used_teams || []).length === 0 ? (
                  <p className="text-sm text-[#6A6A60]">No data yet.</p>
                ) : (
                  metrics.most_used_teams.map((item) => (
                    <div key={item.team} className="flex justify-between text-sm border-b border-[#1A1A14]/[0.06] pb-2 last:border-b-0 last:pb-0">
                      <span className="text-[#1A1A14]">{item.team}</span>
                      <span className="text-[#6A6A60]">{item.count} runs</span>
                    </div>
                  ))
                )}
              </div>
              <div className={`${appGlassCard} space-y-3`}>
                <h3 className={appSectionTitle}>Most Used Agents</h3>
                {(metrics.most_used_agents || []).length === 0 ? (
                  <p className="text-sm text-[#6A6A60]">No data yet.</p>
                ) : (
                  metrics.most_used_agents.map((item) => (
                    <div key={item.agent} className="flex justify-between text-sm border-b border-[#1A1A14]/[0.06] pb-2 last:border-b-0 last:pb-0">
                      <span className="text-[#1A1A14]">{item.agent}</span>
                      <span className="text-[#6A6A60]">{item.count} runs</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {isTeamModalOpen && (
          <div className={appModalOverlay}>
            <div className={`${appCard} w-full max-w-lg max-h-[90vh] flex flex-col`}>
              <div className={`${appCardPadding} flex justify-between items-center border-b border-[#1A1A14]/10`}>
                <h2 className={appSectionTitle}>{teamForm.id ? 'Edit Team' : 'Create Team'}</h2>
                <button onClick={() => setIsTeamModalOpen(false)} className={appBtnIconPrimary}>
                  <X size={20} />
                </button>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); saveTeamMutation.mutate(); }}
                className={`${appCardPadding} space-y-4 overflow-y-auto flex-1`}
              >
                <div>
                  <label className={appLabel}>Team Name</label>
                  <input
                    required
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    className={appInputPlain}
                    placeholder="e.g. Market Research Team"
                  />
                </div>
                <div>
                  <label className={appLabel}>Description</label>
                  <textarea
                    rows={2}
                    value={teamForm.description}
                    onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                    className={`${appInputPlain} resize-none`}
                  />
                </div>
                <div>
                  <label className={appLabel}>
                    AI Employee Members (execution order)
                  </label>
                  {employees.length === 0 ? (
                    <p className="text-sm text-[#6A6A60]">
                      No active AI employees. Create employees in AI Employee Studio first.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-[#1A1A14]/10 rounded-xl p-2 bg-white/30">
                      {employees.map((emp) => (
                        <label key={emp.id} className="flex items-center gap-2 p-2 hover:bg-[#1A1A14]/[0.03] rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={teamForm.memberIds.includes(emp.id)}
                            onChange={() => toggleMember(emp.id)}
                          />
                          <span className="text-sm text-[#1A1A14]">
                            {emp.title} — {emp.data?.role}
                            {teamForm.memberIds.includes(emp.id) && (
                              <span className="text-[#1A1A14] font-semibold ml-1">
                                (#{teamForm.memberIds.indexOf(emp.id) + 1})
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setIsTeamModalOpen(false)} className={appBtnGhost}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveTeamMutation.isPending || teamForm.memberIds.length === 0}
                    className={appBtnPrimary}
                  >
                    {saveTeamMutation.isPending ? 'Saving...' : 'Save Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
