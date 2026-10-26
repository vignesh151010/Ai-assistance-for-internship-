import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  BarChart3,
  Download,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Mail,
  Cpu,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
  Layers,
  CheckCircle,
  XCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export const AnalyticsReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/analytics');
      setData(res.data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExport = async (entityType, defaultFilename) => {
    setDownloading(prev => ({ ...prev, [entityType]: true }));
    try {
      const res = await api.get(`/reports/export/${entityType}`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', defaultFilename || `${entityType}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export failed for ${entityType}`, err);
      alert(`Failed to export ${entityType} report.`);
    } finally {
      setDownloading(prev => ({ ...prev, [entityType]: false }));
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw className="spin" size={32} style={{ margin: '0 auto 16px', color: '#f97316' }} />
        <p style={{ fontWeight: 600 }}>Compiling real-time system analytics and report data...</p>
      </div>
    );
  }

  const enrollment = data?.enrollment || { total_interns: 0, by_role: [] };
  const progress = data?.progress_distribution || { '0_25': 0, '26_50': 0, '51_75': 0, '76_100': 0 };
  const submissions = data?.submissions || { total_tasks: 0, submitted_count: 0, overdue_count: 0, on_time_rate: 0 };
  const reviews = data?.reviews || { total_reviews: 0, outcomes: {} };
  const certs = data?.certificates || { total_issued: 0, revoked: 0 };
  const notifications = data?.notifications || {};
  const automation = data?.automation_reliability || { total_jobs: 0, success_count: 0, failed_count: 0, pending_count: 0, success_rate_percentage: 100 };

  const totalDelivered = Object.values(notifications).reduce((acc, curr) => acc + curr, 0);

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#ea580c'
            }}>
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Program Analytics & Report Hub
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>
                Live operational metrics, lifecycle distribution charts, and institutional audit CSV exports.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/automation"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Cpu size={14} />
            <span>Automation Center</span>
          </Link>
        </div>
      </div>

      {/* Top Level Metric KPIs */}
      <div className="grid-4" style={{ marginBottom: '24px', gap: '16px' }}>
        {/* KPI 1: Enrolled Interns */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ea580c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Total Interns Active</div>
              <div className="stat-value" style={{ color: '#ea580c' }}>{enrollment.total_interns}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Across {enrollment.by_role.length} technical domains
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#ffedd5', color: '#ea580c' }}>
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* KPI 2: On-Time Submissions */}
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Milestone Completion</div>
              <div className="stat-value" style={{ color: '#10b981' }}>
                {submissions.on_time_rate}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {submissions.submitted_count} submitted &bull; {submissions.overdue_count} overdue
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#d1fae5', color: '#10b981' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* KPI 3: Review Outcomes */}
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Reviews Conducted</div>
              <div className="stat-value" style={{ color: '#3b82f6' }}>{reviews.total_reviews}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {reviews.outcomes['APPROVED'] || 0} approved &bull; {reviews.outcomes['NEEDS_REVISION'] || 0} revisions
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#3b82f6' }}>
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* KPI 4: Automation Reliability */}
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Engine Reliability</div>
              <div className="stat-value" style={{ color: '#8b5cf6' }}>
                {automation.success_rate_percentage}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {automation.success_count} success &bull; {automation.failed_count} failures
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#ede9fe', color: '#8b5cf6' }}>
              <Cpu size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Breakdown Charts & Analysis */}
      <div className="grid-2" style={{ gap: '24px', marginBottom: '32px' }}>
        
        {/* Domain & Track Enrollment Breakdown */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">Enrollment Distribution by Domain</div>
              <div className="card-subtitle">Breakdown of ingested candidates by specialization</div>
            </div>
            <span className="badge badge-info">{enrollment.by_role.length} Tracks</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {enrollment.by_role.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                No active intern profiles enrolled yet.
              </div>
            ) : (
              enrollment.by_role.map((item, idx) => {
                const pct = enrollment.total_interns > 0
                  ? Math.round((item.count / enrollment.total_interns) * 100)
                  : 0;
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.role}</span>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{item.count} interns ({pct}%)</span>
                    </div>
                    <div style={{
                      height: '10px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '5px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: idx % 2 === 0 ? '#ea580c' : '#f97316',
                        borderRadius: '5px',
                        transition: 'width 0.5s ease-in-out'
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Milestone Progress Distribution Buckets */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">Curriculum Progress Stages</div>
              <div className="card-subtitle">Cohort distribution across completion thresholds</div>
            </div>
            <span className="badge badge-warning">Cohort Flow</span>
          </div>

          <div className="grid-2" style={{ gap: '14px', marginTop: '8px' }}>
            {/* Stage 1 */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stage 1</span>
                <span className="badge badge-neutral" style={{ fontSize: '11px' }}>0 - 25%</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                {progress['0_25'] || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Onboarding & Orientation
              </div>
            </div>

            {/* Stage 2 */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Stage 2</span>
                <span className="badge badge-info" style={{ fontSize: '11px' }}>26 - 50%</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                {progress['26_50'] || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Core Deliverables in Development
              </div>
            </div>

            {/* Stage 3 */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Stage 3</span>
                <span className="badge badge-warning" style={{ fontSize: '11px' }}>51 - 75%</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                {progress['51_75'] || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Review Milestones & Revisions
              </div>
            </div>

            {/* Stage 4 */}
            <div style={{
              padding: '16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Stage 4</span>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>76 - 100%</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#065f46' }}>
                {progress['76_100'] || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                Certification & Graduation
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Second Row: Review Decisions & Communications Delivery */}
      <div className="grid-2" style={{ gap: '24px', marginBottom: '32px' }}>
        
        {/* Review Outcome Decisions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Live Mentor Review Outcomes</div>
            <div className="card-subtitle">Decisions rendered during Google Meet review evaluation sessions</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={18} color="#16a34a" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#166534' }}>Approved</div>
                  <div style={{ fontSize: '12px', color: '#15803d' }}>Criteria satisfied, unlocked next milestone or certificate</div>
                </div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#166534' }}>
                {reviews.outcomes['APPROVED'] || 0}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="#d97706" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400e' }}>Needs Revision</div>
                  <div style={{ fontSize: '12px', color: '#b45309' }}>Action plan provided; follow-up session scheduled</div>
                </div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#92400e' }}>
                {reviews.outcomes['NEEDS_REVISION'] || 0}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <XCircle size={18} color="#dc2626" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#991b1b' }}>Escalated / Action Required</div>
                  <div style={{ fontSize: '12px', color: '#b91c1c' }}>Requires coordinator administrative intervention</div>
                </div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>
                {reviews.outcomes['ESCALATED'] || 0}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={18} color="#64748b" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#334155' }}>Scheduled / Pending Execution</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Awaiting scheduled calendar time or intern check-in</div>
                </div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#334155' }}>
                {reviews.outcomes['PENDING'] || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Certificate Registry & Delivery Audit */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Accredited Credentials & Dispatch Health</div>
            <div className="card-subtitle">ReportLab vector PDF generation & automated email dispatch</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Award size={28} color="#ea580c" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#9a3412' }}>Official Certificates Generated</div>
                  <div style={{ fontSize: '12px', color: '#c2410c' }}>With SHA-256 signatures & verifiable QR hashes</div>
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ea580c' }}>
                {certs.total_issued}
              </div>
            </div>

            {/* Email Dispatch Health */}
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} color="#64748b" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>Automated Email Dispatch</span>
                </div>
                <span className="badge badge-success">
                  {totalDelivered} Total Messages Logged
                </span>
              </div>

              <div className="grid-2" style={{ gap: '10px' }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Sent / Delivered</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>
                    {(notifications['SENT'] || 0) + (notifications['DELIVERED'] || 0)}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Queued / Pending</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#ea580c', marginTop: '2px' }}>
                    {notifications['PENDING'] || 0}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link to="/verify-certificate" target="_blank" style={{ fontSize: '13px', fontWeight: 600, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Open Public Verification Portal</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Institutional Export Section */}
      <div className="card" style={{ border: '2px solid #fed7aa', backgroundColor: '#fffbf5' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #ffedd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#ea580c'
            }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="card-title" style={{ color: '#9a3412' }}>Institutional Data & Audit CSV Exports</div>
              <div className="card-subtitle" style={{ color: '#c2410c' }}>
                Download structured records for academic accreditation, audit compliance, and external reporting.
              </div>
            </div>
          </div>
        </div>

        <div className="grid-4" style={{ gap: '16px', marginTop: '16px' }}>
          {/* Export 1: Interns */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Users size={18} color="#ea580c" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Intern Directory</h4>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
                Candidate IDs, full names, college affiliations, active tracks, progress %, start/end dates.
              </p>
            </div>
            <button
              onClick={() => handleExport('interns', 'interns_roster_report.csv')}
              disabled={downloading['interns']}
              className="btn btn-secondary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={14} className={downloading['interns'] ? 'spin' : ''} />
              <span>{downloading['interns'] ? 'Exporting...' : 'Export Interns CSV'}</span>
            </button>
          </div>

          {/* Export 2: Reviews */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={18} color="#3b82f6" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Review Sessions</h4>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
                Session timestamps, mentor assignments, Google Meet links, attendance status, and outcome evaluations.
              </p>
            </div>
            <button
              onClick={() => handleExport('reviews', 'reviews_audit_report.csv')}
              disabled={downloading['reviews']}
              className="btn btn-secondary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={14} className={downloading['reviews'] ? 'spin' : ''} />
              <span>{downloading['reviews'] ? 'Exporting...' : 'Export Reviews CSV'}</span>
            </button>
          </div>

          {/* Export 3: Certificates */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Award size={18} color="#10b981" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Certificates</h4>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
                Accredited certificate identifiers, recipient names, dates of completion, and public validation links.
              </p>
            </div>
            <button
              onClick={() => handleExport('certificates', 'certificates_registry_report.csv')}
              disabled={downloading['certificates']}
              className="btn btn-secondary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={14} className={downloading['certificates'] ? 'spin' : ''} />
              <span>{downloading['certificates'] ? 'Exporting...' : 'Export Certs CSV'}</span>
            </button>
          </div>

          {/* Export 4: Automation Jobs */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Cpu size={18} color="#8b5cf6" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Engine Jobs Log</h4>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
                Durable job queue execution traces, retry backoff counts, payload parameters, and exception logs.
              </p>
            </div>
            <button
              onClick={() => handleExport('jobs', 'automation_jobs_audit.csv')}
              disabled={downloading['jobs']}
              className="btn btn-secondary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={14} className={downloading['jobs'] ? 'spin' : ''} />
              <span>{downloading['jobs'] ? 'Exporting...' : 'Export Jobs CSV'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
