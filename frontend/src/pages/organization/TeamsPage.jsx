import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { teamsAPI } from '../../api/teams';
import { Plus, Edit, Search, Power } from 'lucide-react';
import { useRbac } from '../../hooks/useRbac';
import { PERMISSIONS } from '../../utils/rbac';
import { orgListQueryKey } from '../../utils/pagination';
import { orgSearchWrap, orgToolbarRow, orgPageShell, orgPageTitle, orgPageDesc, orgSectionTitle, orgInputWithIcon, orgInputPlain, orgBtnPrimary, orgBtnGhost, orgBtnIcon, orgBtnIconPrimary, orgTableWrap, orgTableHead, orgTh, orgTr, orgTd, orgTdMuted, orgBadgeActive, orgBadgeInactive, orgModalOverlay, orgModal, orgError, orgEmpty, orgLoading, orgPagination } from './orgStyles';

const PAGE_SIZE = 10;

const emptyForm = { id: null, name: '', description: '' };

export default function TeamsPage({ isSubSection = false }) {
  const { hasPermission } = useRbac();
  const canManageTeams = hasPermission(PERMISSIONS.MANAGE_TEAMS);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [errorText, setErrorText] = useState('');

  const { data: teamsData, isLoading } = useQuery({
    queryKey: orgListQueryKey('teams', PAGE_SIZE, (page - 1) * PAGE_SIZE),
    queryFn: () => teamsAPI.list({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
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
  const totalTeams = teamsData?.total ?? 0;
  const filteredTeams = teamsList.filter((t) => `${t.name} ${t.description || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const teams = filteredTeams;
  const totalPages = Math.max(1, Math.ceil(totalTeams / PAGE_SIZE));
  const hasNextPage = page * PAGE_SIZE < totalTeams;
  const openForm = (team = emptyForm) => {
    setForm({ id: team.id || null, name: team.name || '', description: team.description || '' });
    setErrorText('');
    setIsOpen(true);
  };

  const content = (
    <div className={orgPageShell}>
      {!isSubSection ? (
        <div>
          <h1 className={orgPageTitle}>Teams</h1>
          <p className={orgPageDesc}>Manage organization teams</p>
        </div>
      ) : (
        <div>
          <h2 className={orgSectionTitle}>Teams</h2>
          <p className={orgPageDesc}>Manage organization teams</p>
        </div>
      )}

      <div className={orgToolbarRow}>
        <div className={orgSearchWrap}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A60]" size={18} />
            <input type="text" placeholder="Search teams..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className={orgInputWithIcon} />
          </div>
        </div>
        {canManageTeams && (
          <button type="button" onClick={() => openForm()} className={orgBtnPrimary}>
            <Plus size={18} />
            Add Team
          </button>
        )}
      </div>

      <div className={orgTableWrap}>
        {isLoading ? <div className={orgLoading}>Loading...</div> : teams.length === 0 ? <div className={orgEmpty}>No teams found</div> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className={orgTableHead}>
                  <tr>
                    <th className={orgTh}>Name</th>
                    <th className={orgTh}>Description</th>
                    <th className={orgTh}>Status</th>
                    <th className={`${orgTh} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id} className={orgTr}>
                      <td className={`${orgTd} font-medium`}>{team.name}</td>
                      <td className={orgTdMuted}>{team.description || '-'}</td>
                      <td className={orgTd}>
                        <span className={team.is_active ? orgBadgeActive : orgBadgeInactive}>{team.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className={orgTd}>
                        {canManageTeams ? (
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => openForm(team)} className={orgBtnIconPrimary} title="Edit team"><Edit size={18} /></button>
                          <button type="button" onClick={() => statusMutation.mutate({ id: team.id, active: !team.is_active })} className={orgBtnIcon} title={team.is_active ? 'Disable team' : 'Enable team'}><Power size={18} /></button>
                        </div>
                        ) : (
                          <span className={orgTdMuted}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-[#1A1A14]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-sm text-[#6A6A60]">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className={orgPagination}>Previous</button>
                <button type="button" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)} className={orgPagination}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {isOpen && (
        <div className={orgModalOverlay}>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className={`${orgModal} max-w-lg`}>
            <h2 className={orgSectionTitle}>{form.id ? 'Edit Team' : 'Add Team'}</h2>
            {errorText && <div className={orgError}>{errorText}</div>}
            <input required placeholder="Team name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={orgInputPlain} />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${orgInputPlain} min-h-[88px] resize-y`} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className={orgBtnGhost}>Cancel</button>
              <button type="submit" disabled={saveMutation.isPending} className={orgBtnPrimary}>{saveMutation.isPending ? 'Saving...' : 'Save Team'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  if (isSubSection) return content;
  return <MainLayout>{content}</MainLayout>;
}
