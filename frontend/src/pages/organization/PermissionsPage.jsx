import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { permissionsAPI } from '../../api/permissions';
import { Shield } from 'lucide-react';

export default function PermissionsPage({ isSubSection = false }) {
  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsAPI.list(),
  });

  const permissions = permissionsData?.data || [];

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Permissions</h1>
        <p className="text-muted-foreground mt-2">View system permissions used for Role-Based Access Control (RBAC)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : permissions.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-card border border-border border-dashed rounded-lg text-muted-foreground">
            No permissions found
          </div>
        ) : (
          permissions.map((perm) => (
            <div key={perm.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                <Shield size={16} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">{perm.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{perm.description || 'No description provided'}</p>
                <p className="text-[10px] text-primary mt-2 font-medium">Permission ID: #{perm.id}</p>
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
