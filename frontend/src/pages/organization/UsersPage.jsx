import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { usersAPI } from '../../api/users';
import { rolesAPI } from '../../api/roles';
import { departmentsAPI } from '../../api/departments';
import { teamsAPI } from '../../api/teams';
import { Plus, Edit, Search, UserCheck, UserX } from 'lucide-react';
import { useRbac } from '../../hooks/useRbac';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { PERMISSIONS } from '../../utils/rbac';
import { orgSearchWrap, orgToolbarRow, orgPageShell, orgPageTitle, orgPageDesc, orgSectionTitle, orgInputWithIcon, orgInputPlain, orgSelect, orgBtnPrimary, orgBtnGhost, orgBtnIcon, orgBtnIconPrimary, orgTableWrap, orgTableHead, orgTh, orgTr, orgTd, orgTdMuted, orgBadgeActive, orgBadgeInactive, orgModalOverlay, orgModal, orgError, orgEmpty, orgLoading, orgPagination } from './orgStyles';

const emptyForm = {
  id: null,
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role_id: '',
  department_id: '',
  team_id: '',
};

export default function UsersPage({ isSubSection = false }) {
  const { hasPermission } = useRbac();
  const toast = useToast();
  const canManageUsers = hasPermission(PERMISSIONS.MANAGE_USER_ROLES);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [errorText, setErrorText] = useState('');

  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersAPI.list({ limit: 10, offset: (page - 1) * 10 }),
  });
  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: () => rolesAPI.list() });
  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsAPI.list() });
  const { data: teamData } = useQuery({ queryKey: ['teams'], queryFn: () => teamsAPI.list() });

  const roles = rolesData?.data || [];
  const departments = deptData?.data || [];
  const teams = teamData?.data || [];
  const roleMap = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r.name])), [roles]);
  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.name])), [departments]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name || null,
        email: form.email,
      };
      if (form.id) {
        await usersAPI.update(form.id, payload);
        if (form.role_id) await usersAPI.changeRole(form.id, Number(form.role_id));
        if (form.department_id) await usersAPI.assignDepartment(form.id, Number(form.department_id));
        if (form.team_id) await usersAPI.assignTeam(form.id, Number(form.team_id));
        return true;
      }
      return usersAPI.create({
        ...payload,
        password: form.password,
        role_id: Number(form.role_id),
        department_id: form.department_id ? Number(form.department_id) : null,
        team_id: form.team_id ? Number(form.team_id) : null,
      });
    },
    onSuccess: () => {
      invalidate();
      setIsOpen(false);
      setForm(emptyForm);
      setErrorText('');
      toast.success(form.id ? 'User updated successfully.' : 'User created successfully.');
    },
    onError: (err) => {
      const message = getApiErrorMessage(err, 'Unable to save user');
      setErrorText(message);
      toast.error(message);
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, active }) => active ? usersAPI.enable(id) : usersAPI.disable(id),
    onSuccess: (_, { active }) => {
      invalidate();
      toast.success(active ? 'User enabled successfully.' : 'User disabled successfully.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Unable to update user status.')),
  });

  const usersList = usersData?.data || [];
  const users = usersList.filter((u) =>
    `${u.first_name} ${u.last_name || ''} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const hasNextPage = usersList.length === 10;

  const openCreate = () => {
    setForm({ ...emptyForm, role_id: roles[0]?.id || '' });
    setErrorText('');
    setIsOpen(true);
  };
  const openEdit = (user) => {
    setForm({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name || '',
      email: user.email,
      password: '',
      role_id: user.role_id || '',
      department_id: user.department_id || '',
      team_id: user.team_id || '',
    });
    setErrorText('');
    setIsOpen(true);
  };

  const content = (
    <div className={orgPageShell}>
      {!isSubSection && (
        <div>
          <h1 className={orgPageTitle}>Users</h1>
          <p className={orgPageDesc}>Manage organization users, roles, departments, and teams</p>
        </div>
      )}
      {isSubSection && (
        <div>
          <h2 className={orgSectionTitle}>Users</h2>
          <p className={orgPageDesc}>Manage organization users, roles, departments, and teams</p>
        </div>
      )}

      <div className={orgToolbarRow}>
        <div className={orgSearchWrap}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A60]" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className={orgInputWithIcon}
            />
          </div>
        </div>
        {canManageUsers && (
          <button type="button" onClick={openCreate} className={orgBtnPrimary}>
            <Plus size={18} />
            Add User
          </button>
        )}
      </div>

      <div className={orgTableWrap}>
        {isLoading ? (
          <div className={orgLoading}>Loading...</div>
        ) : error ? (
          <div className={`${orgEmpty} text-red-600`}>Error loading users</div>
        ) : users.length === 0 ? (
          <div className={orgEmpty}>No users found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className={orgTableHead}>
                  <tr>
                    <th className={orgTh}>Name</th>
                    <th className={orgTh}>Email</th>
                    <th className={orgTh}>Department</th>
                    <th className={orgTh}>Team</th>
                    <th className={orgTh}>Role</th>
                    <th className={orgTh}>Status</th>
                    <th className={`${orgTh} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className={orgTr}>
                      <td className={`${orgTd} font-medium`}>{user.first_name} {user.last_name || ''}</td>
                      <td className={orgTdMuted}>{user.email}</td>
                      <td className={orgTdMuted}>{deptMap[user.department_id] || '-'}</td>
                      <td className={orgTdMuted}>{teamMap[user.team_id] || '-'}</td>
                      <td className={orgTdMuted}>{roleMap[user.role_id] || '-'}</td>
                      <td className={orgTd}>
                        <span className={user.is_active ? orgBadgeActive : orgBadgeInactive}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={orgTd}>
                        {canManageUsers ? (
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => openEdit(user)} className={orgBtnIconPrimary} title="Edit user">
                            <Edit size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: user.id, active: !user.is_active })}
                            className={orgBtnIcon}
                            title={user.is_active ? 'Disable user' : 'Enable user'}
                          >
                            {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>
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
              <span className="text-sm text-[#6A6A60]">Page {page}</span>
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
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className={`${orgModal} max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <h2 className={orgSectionTitle}>{form.id ? 'Edit User' : 'Add User'}</h2>
            {errorText && <div className={orgError}>{errorText}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={orgInputPlain} />
              <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={orgInputPlain} />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={orgInputPlain} />
              {!form.id && <input required type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={orgInputPlain} />}
              <select required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} className={orgSelect}>
                <option value="">Select role</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className={orgSelect}>
                <option value="">No department</option>
                {departments.filter((d) => d.is_active).map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
              <select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })} className={orgSelect}>
                <option value="">No team</option>
                {teams.filter((t) => t.is_active).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className={orgBtnGhost}>Cancel</button>
              <button type="submit" disabled={saveMutation.isPending} className={orgBtnPrimary}>{saveMutation.isPending ? 'Saving...' : 'Save User'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  if (isSubSection) return content;
  return <MainLayout>{content}</MainLayout>;
}
