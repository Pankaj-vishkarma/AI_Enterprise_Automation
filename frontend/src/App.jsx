import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

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

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Protected route wrapper
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

// Public route wrapper
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Suspense fallback={<LoadingSpinner />}><LoginPage /></Suspense></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Suspense fallback={<LoadingSpinner />}><RegisterPage /></Suspense></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><Suspense fallback={<LoadingSpinner />}><ForgotPasswordPage /></Suspense></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><Suspense fallback={<LoadingSpinner />}><ResetPasswordPage /></Suspense></PublicRoute>} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><DashboardPage /></Suspense></ProtectedRoute>} />

      {/* Organization Management */}
      <Route path="/organization-management" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><OrganizationManagementPage /></Suspense></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><UsersPage /></Suspense></ProtectedRoute>} />
      <Route path="/departments" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><DepartmentsPage /></Suspense></ProtectedRoute>} />
      <Route path="/teams" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><TeamsPage /></Suspense></ProtectedRoute>} />
      <Route path="/roles" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><RolesPage /></Suspense></ProtectedRoute>} />
      <Route path="/permissions" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><PermissionsPage /></Suspense></ProtectedRoute>} />

      {/* Knowledge Platform */}
      <Route path="/knowledge" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><DocumentsPage /></Suspense></ProtectedRoute>} />
      <Route path="/knowledge/documents" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><DocumentsPage /></Suspense></ProtectedRoute>} />
      <Route path="/knowledge/ask-ai" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><AskAIPage /></Suspense></ProtectedRoute>} />

      {/* Conversations */}
      <Route path="/conversations" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><ConversationsPage /></Suspense></ProtectedRoute>} />

      {/* AI Employee Studio */}
      <Route path="/employees" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><EmployeesPage /></Suspense></ProtectedRoute>} />
      <Route path="/employees/:id" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><EmployeeDetailPage /></Suspense></ProtectedRoute>} />

      {/* Multi-Agent Collaboration */}
      <Route path="/collaboration" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><CollaborationPage /></Suspense></ProtectedRoute>} />

      {/* Workflow Automation */}
      <Route path="/workflows" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><WorkflowsPage /></Suspense></ProtectedRoute>} />
      <Route path="/workflows/instances/:id" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><WorkflowInstancePage /></Suspense></ProtectedRoute>} />

      {/* Business Research Hub */}
      <Route path="/research" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><ResearchPage /></Suspense></ProtectedRoute>} />
      <Route path="/research/:id" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><ResearchReportPage /></Suspense></ProtectedRoute>} />

      {/* Browser Automation */}
      <Route path="/browser-automation" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><BrowserAutomationPage /></Suspense></ProtectedRoute>} />
      <Route path="/browser-automation/:id" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><BrowserTaskPage /></Suspense></ProtectedRoute>} />

      {/* Voice AI Platform */}
      <Route path="/voice-ai" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><VoicePage /></Suspense></ProtectedRoute>} />

      {/* Customer Support Platform */}
      <Route path="/support" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><SupportPage /></Suspense></ProtectedRoute>} />

      {/* Omnichannel Communication Center */}
      <Route path="/omnichannel" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><OmnichannelPage /></Suspense></ProtectedRoute>} />

      {/* Analytics & Reporting */}
      <Route path="/analytics" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><AnalyticsPage /></Suspense></ProtectedRoute>} />

      {/* Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Catch all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
