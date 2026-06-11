import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { usersAPI } from '../../api/users';
import { rolesAPI } from '../../api/roles';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

export default function UsersPage({ isSubSection = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.list(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesAPI.list(),
  });

  const roleMap = React.useMemo(() => {
    return (rolesData?.data || []).reduce((acc, r) => {
      acc[r.id] = r.name;
      return acc;
    }, {});
  }, [rolesData]);

  const usersList = usersData?.data || [];
  const filteredUsers = usersList.filter(u => 
    `${u.first_name} ${u.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = filteredUsers.length;
  const totalPages = Math.ceil(total / 10) || 1;
  const users = filteredUsers.slice((page - 1) * 10, page * 10);

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-2">Manage organization users</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={20} />
          Add User
        </button>
      </div>

      {/* Table */}
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
                    <td className="px-6 py-4 text-muted-foreground">-</td>
                    <td className="px-6 py-4 text-muted-foreground">{roleMap[user.role_id] || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="text-primary hover:bg-secondary p-2 rounded-lg transition">
                          <Edit size={18} />
                        </button>
                        <button className="text-destructive hover:bg-red-50 p-2 rounded-lg transition">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} users
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (isSubSection) return content;

  return (
    <MainLayout>
      {content}
    </MainLayout>
  );
}
