import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import UsersPage from './UsersPage';
import DepartmentsPage from './DepartmentsPage';
import TeamsPage from './TeamsPage';
import RolesPage from './RolesPage';
import PermissionsPage from './PermissionsPage';
import { Users, Network, Lock, Shield } from 'lucide-react';

export default function OrganizationManagementPage() {
  const [activeTab, setActiveTab] = useState('users'); // users, departments, teams, roles, permissions

  const tabs = [
    { id: 'users', label: 'Users', icon: Users, component: UsersPage },
    { id: 'departments', label: 'Departments', icon: Network, component: DepartmentsPage },
    { id: 'teams', label: 'Teams', icon: Network, component: TeamsPage },
    { id: 'roles', label: 'Roles', icon: Lock, component: RolesPage },
    { id: 'permissions', label: 'Permissions', icon: Shield, component: PermissionsPage },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || UsersPage;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organization & User Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure departments, manage teams, assign user roles, customize permissions, and coordinate system access.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-border flex gap-4 text-xs font-bold uppercase tracking-wider overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Tab Panel */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
          <ActiveComponent isSubSection={true} />
        </div>
      </div>
    </MainLayout>
  );
}
