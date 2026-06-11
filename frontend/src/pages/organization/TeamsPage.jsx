import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { teamsAPI } from '../../api/teams';
import { Plus, Edit, Search, Power } from 'lucide-react';

const emptyForm = { id: null, name: '', description: '' };

export default function TeamsPage({ isSubSection = false }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [errorText, setErrorText] = useState('');

  const { data: teamsData, isLoading } = useQuery({ queryKey: ['teams'], queryFn: () => teamsAPI.list() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teams'] });
  const saveMutation = useMutation({
    mutationFn: () => form.id
      ? teamsAPI.update(form.id, { name: form.name, description: form.description || null })
      : teamsAPI.create({ name: form.name, description: form.description || null }),
    onSuccess: () => { invalidate(); setIsOpen(false); setForm(emptyForm); setErrorText(''); },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Unable to save team'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, active }) => active ? teamsAPI.enable(id) : teamsAPI.disable(id),
    onSuccess: invalidate,
  });

  const teamsList = teamsData?.data || [];
  const filteredTeams = teamsList.filter((t) => `${t.name} ${t.description || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const total = filteredTeams.length;
  const totalPages = Math.ceil(total / 10) || 1;
  const teams = filteredTeams.slice((page - 1) * 10, page * 10);
  const openForm = (team = emptyForm) => {
    setForm({ id: team.id || null, name: team.name || '', description: team.description || '' });
    setErrorText('');
    setIsOpen(true);
  };

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Teams</h1>
        <p className="text-muted-foreground mt-2">Manage organization teams</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={20} />
            <input type="text" placeholder="Search teams..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={20} />
          Add Team
        </button>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? <div className="p-8 text-center">Loading...</div> : teams.length === 0 ? <div className="p-8 text-center text-muted-foreground">No teams found</div> : (
          <>
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Description</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-center px-6 py-3 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-border hover:bg-secondary/50">
                    <td className="px-6 py-4 text-foreground font-medium">{team.name}</td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">{team.description || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${team.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{team.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openForm(team)} className="text-primary hover:bg-secondary p-2 rounded-lg" title="Edit team"><Edit size={18} /></button>
                        <button onClick={() => statusMutation.mutate({ id: team.id, active: !team.is_active })} className="text-muted-foreground hover:bg-secondary p-2 rounded-lg" title={team.is_active ? 'Disable team' : 'Enable team'}><Power size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50">Previous</button>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground">{form.id ? 'Edit Team' : 'Add Team'}</h2>
            {errorText && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{errorText}</div>}
            <input required placeholder="Team name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-border rounded-lg bg-input" />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 border border-border rounded-lg bg-input" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border border-border rounded-lg">Cancel</button>
              <button disabled={saveMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">{saveMutation.isPending ? 'Saving...' : 'Save Team'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  if (isSubSection) return content;
  return <MainLayout>{content}</MainLayout>;
}
