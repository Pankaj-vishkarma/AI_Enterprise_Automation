import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import config from './config/env';
import RoleRoute from './components/auth/RoleRoute';
import LoadingSpinner from './components/auth/LoadingSpinner';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Organization Management
import UsersPage from './pages/organization/UsersPage';
import DepartmentsPage from './pages/organization/DepartmentsPage';
import TeamsPage from './pages/organization/TeamsPage';
import RolesPage from './pages/organization/RolesPage';
import PermissionsPage from './pages/organization/PermissionsPage';
import OrganizationManagementPage from './pages/organization/OrganizationManagementPage';

// Knowledge Platform
import DocumentsPage from './pages/knowledge/DocumentsPage';
import AskAIPage from './pages/knowledge/AskAIPage';

// Conversations
import ConversationsPage from './pages/conversations/ConversationsPage';

// New AI & Operations Hub pages
import EmployeesPage from './pages/employees/EmployeesPage';
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage';
import CollaborationPage from './pages/collaboration/CollaborationPage';
import WorkflowsPage from './pages/workflows/WorkflowsPage';
import WorkflowInstancePage from './pages/workflows/WorkflowInstancePage';
import ResearchPage from './pages/research/ResearchPage';
import ResearchReportPage from './pages/research/ResearchReportPage';
import BrowserAutomationPage from './pages/browser/BrowserAutomationPage';
import BrowserTaskPage from './pages/browser/BrowserTaskPage';
import VoicePage from './pages/voice/VoicePage';
import SupportPage from './pages/support/SupportPage';
import OmnichannelPage from './pages/omnichannel/OmnichannelPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';

// Landing
import LandingPage from './pages/landing/LandingPage';

// Other
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/profile/ProfilePage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const GuardedRoute = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute>{children}</RoleRoute>
  </ProtectedRoute>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: config.queryStaleTimeMs,
      retry: config.queryRetry,
    },
  },
});

function AppRoutes() {
  const suspense = (Page) => (
    <GuardedRoute>
      <Suspense fallback={<LoadingSpinner />}>
        <Page />
      </Suspense>
    </GuardedRoute>
  );

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Suspense fallback={<LoadingSpinner />}><LoginPage /></Suspense></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Suspense fallback={<LoadingSpinner />}><RegisterPage /></Suspense></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><Suspense fallback={<LoadingSpinner />}><ForgotPasswordPage /></Suspense></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><Suspense fallback={<LoadingSpinner />}><ResetPasswordPage /></Suspense></PublicRoute>} />

      <Route path="/dashboard" element={suspense(DashboardPage)} />
      <Route path="/profile" element={suspense(ProfilePage)} />

      <Route path="/organization-management" element={suspense(OrganizationManagementPage)} />
      <Route path="/users" element={suspense(UsersPage)} />
      <Route path="/departments" element={suspense(DepartmentsPage)} />
      <Route path="/teams" element={suspense(TeamsPage)} />
      <Route path="/roles" element={suspense(RolesPage)} />
      <Route path="/permissions" element={suspense(PermissionsPage)} />

      <Route path="/knowledge" element={suspense(DocumentsPage)} />
      <Route path="/knowledge/documents" element={suspense(DocumentsPage)} />
      <Route path="/knowledge/ask-ai" element={suspense(AskAIPage)} />

      <Route path="/conversations" element={suspense(ConversationsPage)} />

      <Route path="/employees" element={suspense(EmployeesPage)} />
      <Route path="/employees/:id" element={suspense(EmployeeDetailPage)} />

      <Route path="/collaboration" element={suspense(CollaborationPage)} />
      <Route path="/workflows" element={suspense(WorkflowsPage)} />
      <Route path="/workflows/instances/:id" element={suspense(WorkflowInstancePage)} />

      <Route path="/research" element={suspense(ResearchPage)} />
      <Route path="/research/:id" element={suspense(ResearchReportPage)} />

      <Route path="/browser-automation" element={suspense(BrowserAutomationPage)} />
      <Route path="/browser-automation/:id" element={suspense(BrowserTaskPage)} />

      <Route path="/voice-ai" element={suspense(VoicePage)} />
      <Route path="/support" element={suspense(SupportPage)} />
      <Route path="/omnichannel" element={suspense(OmnichannelPage)} />
      <Route path="/analytics" element={suspense(AnalyticsPage)} />

      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
