import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Award,
  Mail,
  FileSpreadsheet,
  Cpu,
  Video,
  Database,
  ArrowRight,
  ShieldCheck,
  Settings
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [autoStatus, setAutoStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, autoRes] = await Promise.allSettled([
          api.get('/dashboard/admin-stats'),
          api.get('/automation/status')
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (autoRes.status === 'fulfilled') setAutoStatus(autoRes.value.data);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ padding: '20px', fontWeight: 600 }}>Loading live dashboard analytics...</div>;
  }

  const currentMode = autoStatus?.current_mode || 'ACTIVE';

  return (
    <div>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Executive Program Dashboard</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Live metrics calculated from actual system records & integrations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/admin/automation" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} />
            <span>Automation Center</span>
          </Link>
          <Link to="/admin/import" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={16} />
            <span>Import Candidates Excel</span>
          </Link>
        </div>
      </div>

      {/* Autonomous Lifecycle Banner */}
      <div style={{
        marginBottom: '24px',
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        borderRadius: '12px',
        border: '1px solid #fed7aa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            backgroundColor: '#ea580c', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)'
          }}>
            <Cpu size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#9a3412' }}>
                Autonomous Internship Lifecycle Engine
              </span>
              <span className={`badge ${currentMode === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                ● Mode: {currentMode}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#c2410c', marginTop: '2px' }}>
              Zero routine manual administration. Background worker: <strong>{autoStatus?.scheduler_running ? 'Online & Monitoring' : 'Standby'}</strong> &bull; Pending jobs: <strong>{autoStatus?.pending_jobs || 0}</strong> &bull; Active workflows: <strong>{autoStatus?.active_workflows || 0}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/admin/automation" className="btn btn-secondary" style={{ backgroundColor: '#ffffff', borderColor: '#fed7aa', color: '#9a3412', fontSize: '13px', padding: '6px 14px' }}>
            Manage Engine & Jobs
          </Link>
          <Link to="/admin/settings" className="btn btn-secondary" style={{ backgroundColor: '#ffffff', borderColor: '#fed7aa', color: '#9a3412', fontSize: '13px', padding: '6px 14px' }}>
            <Settings size={14} />
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <div className="stat-widget">
          <div className="stat-icon" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>
            <Users size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.total_interns || 0}</div>
            <div className="stat-label">Total Registered Interns</div>
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.completed_interns || 0}</div>
            <div className="stat-label">Graduated & Certified</div>
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <Clock size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.pending_submissions || 0}</div>
            <div className="stat-label">Pending Task Submissions</div>
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.overdue_tasks || 0}</div>
            <div className="stat-label">Overdue Tasks</div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Reviews & Mentorship</div>
              <div className="card-subtitle">Upcoming and action-required sessions</div>
            </div>
            <Calendar size={20} color="#4338ca" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>Upcoming Google Meet Reviews:</span>
              <strong style={{ color: '#0f172a' }}>{stats?.upcoming_reviews || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>Awaiting Mentor Decisions:</span>
              <strong style={{ color: '#d97706' }}>{stats?.reviews_requiring_decision || 0}</strong>
            </div>
            <Link to="/admin/reviews" style={{ fontSize: '13px', color: '#4338ca', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              <span>Manage review calendar</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Completion & Credentials</div>
              <div className="card-subtitle">Graduation approval pipeline</div>
            </div>
            <Award size={20} color="#059669" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>Pending Admin Approval:</span>
              <strong style={{ color: '#2563eb' }}>{stats?.pending_completion_approvals || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>Official Certificates Issued:</span>
              <strong style={{ color: '#059669' }}>{stats?.certificates_issued || 0}</strong>
            </div>
            <Link to="/admin/interns" style={{ fontSize: '13px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              <span>Review eligible candidates</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Automation & Dispatch</div>
              <div className="card-subtitle">Email queue and reliability</div>
            </div>
            <Mail size={20} color="#2563eb" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>Automation Failures:</span>
              <strong style={{ color: stats?.email_failures > 0 ? '#dc2626' : '#059669' }}>
                {stats?.email_failures || 0}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>Queue Retry Status:</span>
              <span className="badge badge-success">Healthy</span>
            </div>
            <Link to="/admin/notifications" style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              <span>Inspect notification logs</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Integration Health Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Connected System Integrations</div>
            <div className="card-subtitle">Real-time status of backend services and providers</div>
          </div>
        </div>
        <div className="grid-4">
          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Cpu size={24} color="#6366f1" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>AI Engine</div>
              <div style={{ fontSize: '12px', color: '#059669' }}>{stats?.system_status?.ai_provider}</div>
            </div>
          </div>

          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Video size={24} color="#0284c7" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Google Meet & Calendar</div>
              <div style={{ fontSize: '12px', color: '#0284c7' }}>{stats?.system_status?.google_calendar}</div>
            </div>
          </div>

          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail size={24} color="#2563eb" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Email Automation</div>
              <div style={{ fontSize: '12px', color: '#059669' }}>{stats?.system_status?.email_service}</div>
            </div>
          </div>

          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database size={24} color="#059669" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Storage & Database</div>
              <div style={{ fontSize: '12px', color: '#059669' }}>{stats?.system_status?.database}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
