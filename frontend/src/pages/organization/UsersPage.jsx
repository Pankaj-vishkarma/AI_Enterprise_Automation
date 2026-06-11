import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { usersAPI } from '../../api/users';
import { rolesAPI } from '../../api/roles';
import { departmentsAPI } from '../../api/departments';
import { teamsAPI } from '../../api/teams';
import { Plus, Edit, Search, UserCheck, UserX } from 'lucide-react';

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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [errorText, setErrorText] = useState('');

  const { data: usersData, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: () => usersAPI.list() });
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
    },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Unable to save user'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, active }) => active ? usersAPI.enable(id) : usersAPI.disable(id),
    onSuccess: invalidate,
  });

  const usersList = usersData?.data || [];
  const filteredUsers = usersList.filter((u) =>
    `${u.first_name} ${u.last_name || ''} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const total = filteredUsers.length;
  const totalPages = Math.ceil(total / 10) || 1;
  const users = filteredUsers.slice((page - 1) * 10, page * 10);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-2">Manage organization users, roles, departments, and teams</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={20} />
          Add User
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Error loading users</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No users found</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Email</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Department</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Team</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Role</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-center px-6 py-3 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-secondary/50 transition">
                    <td className="px-6 py-4 text-foreground font-medium">{user.first_name} {user.last_name || ''}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">{deptMap[user.department_id] || '-'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{teamMap[user.team_id] || '-'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{roleMap[user.role_id] || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(user)} className="text-primary hover:bg-secondary p-2 rounded-lg transition" title="Edit user">
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: user.id, active: !user.is_active })}
                          className="text-muted-foreground hover:bg-secondary p-2 rounded-lg transition"
                          title={user.is_active ? 'Disable user' : 'Enable user'}
                        >
                          {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} users</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground">{form.id ? 'Edit User' : 'Add User'}</h2>
            {errorText && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{errorText}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="px-4 py-2 border border-border rounded-lg bg-input" />
              <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="px-4 py-2 border border-border rounded-lg bg-input" />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-4 py-2 border border-border rounded-lg bg-input" />
              {!form.id && <input required type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-4 py-2 border border-border rounded-lg bg-input" />}
              <select required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} className="px-4 py-2 border border-border rounded-lg bg-input">
                <option value="">Select role</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="px-4 py-2 border border-border rounded-lg bg-input">
                <option value="">No department</option>
                {departments.filter((d) => d.is_active).map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
              <select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })} className="px-4 py-2 border border-border rounded-lg bg-input">
                <option value="">No team</option>
                {teams.filter((t) => t.is_active).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border border-border rounded-lg">Cancel</button>
              <button disabled={saveMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">{saveMutation.isPending ? 'Saving...' : 'Save User'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  if (isSubSection) return content;
  return <MainLayout>{content}</MainLayout>;
}
