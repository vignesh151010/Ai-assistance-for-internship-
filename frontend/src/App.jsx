import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public Pages
import { Login } from './pages/Login';
import { VerifyCertificate } from './pages/VerifyCertificate';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ExcelImport } from './pages/admin/ExcelImport';
import { InternManagement } from './pages/admin/InternManagement';
import { TaskManagement } from './pages/admin/TaskManagement';
import { ReviewScheduler } from './pages/admin/ReviewScheduler';
import { CertificatesList } from './pages/admin/CertificatesList';
import { NotificationsAudit } from './pages/admin/NotificationsAudit';
import { AutomationCenter } from './pages/admin/AutomationCenter';
import { SystemSettings } from './pages/admin/SystemSettings';
import { AnalyticsReports } from './pages/admin/AnalyticsReports';

// Mentor Pages
import { MentorDashboard } from './pages/mentor/MentorDashboard';
import { SubmissionReview } from './pages/mentor/SubmissionReview';

// Intern Pages
import { InternDashboard } from './pages/intern/InternDashboard';
import { MyTasks } from './pages/intern/MyTasks';
import { ReviewSessions } from './pages/intern/ReviewSessions';
import { MyCertificate } from './pages/intern/MyCertificate';

const RootRedirect = () => {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'MENTOR') return <Navigate to="/mentor" replace />;
  return <Navigate to="/intern" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify-certificate" element={<VerifyCertificate />} />
          <Route path="/verify-certificate/:certId" element={<VerifyCertificate />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/automation" element={<AutomationCenter />} />
            <Route path="/admin/import" element={<ExcelImport />} />
            <Route path="/admin/interns" element={<InternManagement />} />
            <Route path="/admin/tasks" element={<TaskManagement />} />
            <Route path="/admin/reviews" element={<ReviewScheduler />} />
            <Route path="/admin/certificates" element={<CertificatesList />} />
            <Route path="/admin/reports" element={<AnalyticsReports />} />
            <Route path="/admin/notifications" element={<NotificationsAudit />} />
            <Route path="/admin/settings" element={<SystemSettings />} />
          </Route>

          {/* Mentor Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']} />}>
            <Route path="/mentor" element={<MentorDashboard />} />
            <Route path="/mentor/interns" element={<InternManagement />} />
            <Route path="/mentor/reviews" element={<ReviewScheduler />} />
            <Route path="/mentor/review-workspace/:internId" element={<SubmissionReview />} />
          </Route>

          {/* Intern Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['INTERN', 'ADMIN']} />}>
            <Route path="/intern" element={<InternDashboard />} />
            <Route path="/intern/tasks" element={<MyTasks />} />
            <Route path="/intern/reviews" element={<ReviewSessions />} />
            <Route path="/intern/certificate" element={<MyCertificate />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
