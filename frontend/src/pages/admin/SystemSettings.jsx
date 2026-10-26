import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import api from '../../services/api';
import {
  Settings,
  Building,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Clock,
  Mail,
  Cpu,
  Video,
  Award,
  Calendar,
  Sparkles
} from 'lucide-react';

export const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [company, setCompany] = useState({
    company_name: '',
    official_email: '',
    website: '',
    logo_url: '',
    timezone: 'Asia/Kolkata',
    working_hours_start: '09:00',
    working_hours_end: '18:00'
  });
  const [policies, setPolicies] = useState({
    default_internship_duration_days: 30,
    default_review_interval_days: 7,
    deadline_reminder_hours: 24,
    review_reminder_hours: 24,
    auto_issue_certificate: true,
    career_guidance_email_enabled: true,
    max_job_retries: 4
  });
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadSettings = async () => {
    try {
      const [compRes, polRes, readRes] = await Promise.all([
        api.get('/settings/company'),
        api.get('/settings/policies'),
        api.get('/settings/readiness')
      ]);
      setCompany(compRes.data);
      setPolicies(polRes.data);
      setReadiness(readRes.data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings/company', company);
      showToast('Company settings updated successfully.');
      await loadSettings();
    } catch (err) {
      showToast(`Save failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicies = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings/policies', policies);
      showToast('Lifecycle and automation policies saved.');
      await loadSettings();
    } catch (err) {
      showToast(`Save failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestIntegration = async (service) => {
    setTestResult({ service, loading: true });
    try {
      const res = await api.post(`/settings/test-integration/${service}`);
      setTestResult({ service, success: res.data.success, message: res.data.message });
      showToast(res.data.message);
    } catch (err) {
      setTestResult({ service, success: false, message: err.response?.data?.detail || err.message });
      showToast(`Test failed: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="page-wrapper">
          {toastMessage && (
            <div style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderLeft: '4px solid #ea580c'
            }}>
              <Sparkles size={18} color="#ea580c" />
              <span>{toastMessage}</span>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0 }}>System Settings & Setup Wizard</h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
              One-time setup for company profile, external integrations readiness checklist, and automated internship policies.
            </p>
          </div>

          {/* Readiness Banner */}
          {readiness && (
            <div className="card" style={{
              padding: '16px 20px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              border: '1px solid #fed7aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#ea580c" />
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#9a3412' }}>
                    Production Readiness Score: {readiness.readiness_score}%
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#c2410c', marginTop: '2px' }}>
                  {readiness.summary}
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveTab('readiness')}
                style={{ background: '#ffffff', color: '#ea580c', borderColor: '#ea580c', fontWeight: 700 }}
              >
                Inspect Checklist
              </button>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
            <button
              onClick={() => setActiveTab('company')}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'company' ? '#ea580c' : '#64748b',
                borderBottom: activeTab === 'company' ? '2px solid #ea580c' : '2px solid transparent',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Building size={16} />
              <span>Company Information</span>
            </button>

            <button
              onClick={() => setActiveTab('policies')}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'policies' ? '#ea580c' : '#64748b',
                borderBottom: activeTab === 'policies' ? '2px solid #ea580c' : '2px solid transparent',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sliders size={16} />
              <span>Automation Policies</span>
            </button>

            <button
              onClick={() => setActiveTab('readiness')}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'readiness' ? '#ea580c' : '#64748b',
                borderBottom: activeTab === 'readiness' ? '2px solid #ea580c' : '2px solid transparent',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ShieldCheck size={16} />
              <span>Integrations & Checklist</span>
            </button>
          </div>

          {/* TAB 1: COMPANY */}
          {activeTab === 'company' && (
            <div className="card" style={{ maxWidth: '800px', padding: '24px' }}>
              <form onSubmit={handleSaveCompany}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">Official Company Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={company.company_name}
                      onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Official Contact Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={company.official_email}
                      onChange={(e) => setCompany({ ...company, official_email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">Website URL</label>
                    <input
                      type="url"
                      className="form-control"
                      value={company.website || ''}
                      onChange={(e) => setCompany({ ...company, website: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Timezone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={company.timezone || 'Asia/Kolkata'}
                      onChange={(e) => setCompany({ ...company, timezone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Daily Working Hours (Start)</label>
                    <input
                      type="time"
                      className="form-control"
                      value={company.working_hours_start || '09:00'}
                      onChange={(e) => setCompany({ ...company, working_hours_start: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Daily Working Hours (End)</label>
                    <input
                      type="time"
                      className="form-control"
                      value={company.working_hours_end || '18:00'}
                      onChange={(e) => setCompany({ ...company, working_hours_end: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ background: '#ea580c', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Company Profile'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: POLICIES */}
          {activeTab === 'policies' && (
            <div className="card" style={{ maxWidth: '800px', padding: '24px' }}>
              <form onSubmit={handleSavePolicies}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">Default Internship Duration (Days)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={policies.default_internship_duration_days}
                      onChange={(e) => setPolicies({ ...policies, default_internship_duration_days: parseInt(e.target.value) || 30 })}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Review Interval Cadence (Days)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={policies.default_review_interval_days}
                      onChange={(e) => setPolicies({ ...policies, default_review_interval_days: parseInt(e.target.value) || 7 })}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Deadline Reminder Window (Hours Prior)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={policies.deadline_reminder_hours}
                      onChange={(e) => setPolicies({ ...policies, deadline_reminder_hours: parseInt(e.target.value) || 24 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Review Reminder Window (Hours Prior)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={policies.review_reminder_hours}
                      onChange={(e) => setPolicies({ ...policies, review_reminder_hours: parseInt(e.target.value) || 24 })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={policies.auto_issue_certificate}
                      onChange={(e) => setPolicies({ ...policies, auto_issue_certificate: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#ea580c' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Automatic Certificate Issuance on Completion</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Immediately generate vector PDF certificate and verification URL when all criteria pass without requiring separate manual button click.</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={policies.career_guidance_email_enabled}
                      onChange={(e) => setPolicies({ ...policies, career_guidance_email_enabled: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#ea580c' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Dispatch AI Career Development Package</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Automatically append personalized resume points, portfolio tips, and learning roadmaps to final completion email.</div>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ background: '#ea580c', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Update Automation Policies'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: READINESS & TESTS */}
          {activeTab === 'readiness' && (
            <div>
              {/* Integration Verification Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Cpu size={20} color="#ea580c" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>AI Task & Evaluation Engine</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                    Analyzes candidate tasks, generates beginner roadmaps, and evaluates code deliverables against criteria.
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleTestIntegration('ai')}
                    style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Play size={14} />
                    <span>Run AI Test Prompt</span>
                  </button>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Mail size={20} color="#0284c7" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Transactional Email Service</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                    Delivers onboarding letters, meeting invitations, OTP codes, improvement plans, and accredited certificates.
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleTestIntegration('email')}
                    style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Play size={14} />
                    <span>Send Test Email</span>
                  </button>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Video size={20} color="#10b981" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Google Meet Review Link</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                    Creates Google Calendar conferences with Google Meet URLs for live mentor review sessions.
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleTestIntegration('calendar')}
                    style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Play size={14} />
                    <span>Generate Test Room</span>
                  </button>
                </div>
              </div>

              {/* Checklist Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
                  Pre-Activation Readiness Checklist
                </div>
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {readiness?.checklist?.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 20px', width: '40px' }}>
                            {item.status === 'PASS' ? (
                              <CheckCircle2 size={18} color="#10b981" />
                            ) : (
                              <AlertTriangle size={18} color="#f59e0b" />
                            )}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{item.component}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{item.detail}</div>
                            {item.action && (
                              <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', fontWeight: 600 }}>Note: {item.action}</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: item.status === 'PASS' ? '#dcfce7' : '#fef3c7',
                              color: item.status === 'PASS' ? '#166534' : '#92400e'
                            }}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
