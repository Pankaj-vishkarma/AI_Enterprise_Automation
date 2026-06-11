import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { rolesAPI } from '../../api/roles';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function RolesPage({ isSubSection = false }) {
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesAPI.list(),
  });

  const roles = rolesData?.data || [];

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Roles & Permissions</h1>
        <p className="text-muted-foreground mt-2">Manage user roles and permissions</p>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={20} />
          Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Loading...</div>
        ) : roles.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">No roles found</div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{role.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{role.description || 'No description'}</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-primary hover:bg-secondary p-2 rounded-lg">
                    <Edit size={18} />
                  </button>
                  <button className="text-destructive hover:bg-red-50 p-2 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions?.slice(0, 3).map((perm, i) => (
                    <span key={i} className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full">
                      {perm.name}
                    </span>
                  ))}
                  {role.permissions?.length > 3 && (
                    <span className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full">
                      +{role.permissions.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                {role.userCount} users assigned
              </div>
            </div>
          ))
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
