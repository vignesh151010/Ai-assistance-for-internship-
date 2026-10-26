import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  CheckSquare,
  Calendar,
  Award,
  Bell,
  CheckCircle,
  FileText,
  ShieldCheck,
  Briefcase,
  Cpu,
  BarChart3,
  Settings
} from 'lucide-react';

export const Sidebar = () => {
  const { role } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">AI</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff' }}>TechMentorship</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>AI-Powered Academy</div>
        </div>
      </div>

      <ul className="sidebar-menu">
        {/* ADMIN ROUTES */}
        {role === 'ADMIN' && (
          <>
            <li>
              <NavLink to="/admin" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Admin Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/automation" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Cpu size={18} />
                <span>Automation Center</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/import" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <FileSpreadsheet size={18} />
                <span>Excel Ingestion</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/interns" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Intern Directory</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/tasks" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <CheckSquare size={18} />
                <span>Tasks & AI Hub</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/reviews" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Review Scheduling</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/certificates" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Award size={18} />
                <span>Certificate Registry</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Analytics & Reports</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/notifications" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Bell size={18} />
                <span>Notifications & Audit</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Settings size={18} />
                <span>System Settings</span>
              </NavLink>
            </li>
          </>
        )}

        {/* MENTOR ROUTES */}
        {role === 'MENTOR' && (
          <>
            <li>
              <NavLink to="/mentor" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Mentor Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/mentor/interns" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Assigned Interns</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/mentor/reviews" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Review Sessions</span>
              </NavLink>
            </li>
          </>
        )}

        {/* INTERN ROUTES */}
        {role === 'INTERN' && (
          <>
            <li>
              <NavLink to="/intern" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Intern Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/intern/tasks" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <CheckSquare size={18} />
                <span>My Tasks & Roadmap</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/intern/reviews" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Review Meetings</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/intern/certificate" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Award size={18} />
                <span>Certificate & Career</span>
              </NavLink>
            </li>
          </>
        )}

        <hr style={{ borderColor: '#1e293b', margin: '14px 0' }} />

        <li>
          <NavLink to="/verify-certificate" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <ShieldCheck size={18} />
            <span>Verify Credentials</span>
          </NavLink>
        </li>
      </ul>
    </aside>
  );
};
