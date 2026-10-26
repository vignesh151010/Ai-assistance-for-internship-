import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import api from '../../services/api';
import {
  Zap,
  Play,
  Pause,
  AlertOctagon,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Cpu,
  Mail,
  Video,
  Award,
  Layers,
  ChevronRight,
  ShieldCheck,
  Activity,
  History
} from 'lucide-react';

export const AutomationCenter = () => {
  const [statusData, setStatusData] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [jobsData, setJobsData] = useState({ total: 0, jobs: [] });
  const [activeTab, setActiveTab] = useState('workflows');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      const [statusRes, wfRes, jobsRes] = await Promise.all([
        api.get('/automation/status'),
        api.get('/automation/workflows'),
        api.get('/automation/jobs?limit=50')
      ]);
      setStatusData(statusRes.data);
      setWorkflows(wfRes.data);
      setJobsData(jobsRes.data);
    } catch (err) {
      console.error('Error fetching automation center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleModeChange = async (newMode) => {
    setActionLoading(true);
    try {
      await api.post('/automation/mode', { mode: newMode });
      showToast(`Automation mode switched to ${newMode}`);
      await loadData();
    } catch (err) {
      showToast(`Failed to update mode: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunNow = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/automation/run-now');
      const count = res.data.result?.processed_count ?? 0;
      showToast(`Triggered automation pass! Processed ${count} pending jobs.`);
      await loadData();
    } catch (err) {
      showToast(`Failed to trigger cycle: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryJob = async (jobId) => {
    setActionLoading(true);
    try {
      await api.post(`/automation/jobs/${jobId}/retry`);
      showToast(`Job #${jobId} reset to QUEUED for immediate execution.`);
      await loadData();
    } catch (err) {
      showToast(`Failed to retry job: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleWorkflow = async (wf) => {
    setActionLoading(true);
    try {
      const endpoint = wf.is_active ? `/automation/workflows/${wf.id}/pause` : `/automation/workflows/${wf.id}/resume`;
      await api.post(endpoint);
      showToast(`Workflow for ${wf.intern_name} ${wf.is_active ? 'paused' : 'resumed'}.`);
      await loadData();
    } catch (err) {
      showToast(`Action failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getModeBadge = (mode) => {
    switch (mode) {
      case 'ACTIVE':
        return <span className="badge" style={{ backgroundColor: '#10b981', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} /> ACTIVE (PRODUCTION)</span>;
      case 'TEST_MODE':
        return <span className="badge" style={{ backgroundColor: '#0284c7', color: '#fff' }}>TEST MODE (SAFE SANDBOX)</span>;
      case 'PAUSED':
        return <span className="badge" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>PAUSED</span>;
      case 'EMERGENCY_STOP':
        return <span className="badge" style={{ backgroundColor: '#ef4444', color: '#fff' }}>EMERGENCY STOP</span>;
      default:
        return <span className="badge" style={{ backgroundColor: '#64748b', color: '#fff' }}>DISABLED</span>;
    }
  };

  const getStageBadge = (stage) => {
    const stageStr = String(stage);
    let color = '#64748b';
    let bg = '#f1f5f9';
    if (stageStr.includes('COMPLETED')) { color = '#15803d'; bg = '#dcfce7'; }
    else if (stageStr.includes('REVIEW') || stageStr.includes('EVALUATION')) { color = '#b45309'; bg = '#fef3c7'; }
    else if (stageStr.includes('PENDING') || stageStr.includes('TASK_ASSIGNED')) { color = '#0369a1'; bg = '#e0f2fe'; }
    else if (stageStr.includes('ATTENTION') || stageStr.includes('FAILED')) { color = '#b91c1c'; bg = '#fee2e2'; }

    return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color, backgroundColor: bg }}>{stageStr}</span>;
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="page-wrapper">
          {/* Toast Notification */}
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
              <Zap size={18} color="#ea580c" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Header & Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Automation Center</h1>
                {statusData && getModeBadge(statusData.mode)}
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                Persistent event-driven workflow engine coordinating candidate onboarding, AI evaluations, Google Meet scheduling, and accredited credentials.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={handleRunNow}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ea580c' }}
              >
                <RefreshCw size={16} className={actionLoading ? 'spin' : ''} />
                <span>Execute Cycle Now</span>
              </button>

              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px' }}>
                <button
                  onClick={() => handleModeChange('TEST_MODE')}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: statusData?.mode === 'TEST_MODE' ? '#0284c7' : 'transparent',
                    color: statusData?.mode === 'TEST_MODE' ? '#fff' : '#475569'
                  }}
                >
                  Test Mode
                </button>
                <button
                  onClick={() => handleModeChange('ACTIVE')}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: statusData?.mode === 'ACTIVE' ? '#10b981' : 'transparent',
                    color: statusData?.mode === 'ACTIVE' ? '#fff' : '#475569'
                  }}
                >
                  Active
                </button>
                <button
                  onClick={() => handleModeChange('PAUSED')}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: statusData?.mode === 'PAUSED' ? '#f59e0b' : 'transparent',
                    color: statusData?.mode === 'PAUSED' ? '#fff' : '#475569'
                  }}
                >
                  Pause
                </button>
                <button
                  onClick={() => handleModeChange('EMERGENCY_STOP')}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: statusData?.mode === 'EMERGENCY_STOP' ? '#ef4444' : 'transparent',
                    color: statusData?.mode === 'EMERGENCY_STOP' ? '#fff' : '#475569'
                  }}
                >
                  Stop
                </button>
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px', borderTop: '4px solid #ea580c' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Workflows</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {statusData?.summary?.active_workflows ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>of {statusData?.summary?.total_workflows ?? 0} total enrolled</div>
            </div>

            <div className="card" style={{ padding: '16px', borderTop: '4px solid #10b981' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Graduated (Complete)</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {statusData?.summary?.completed_workflows ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>accredited certificates issued</div>
            </div>

            <div className="card" style={{ padding: '16px', borderTop: '4px solid #0284c7' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Queued Jobs</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                {statusData?.summary?.queued_jobs ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{statusData?.summary?.running_jobs ?? 0} currently processing</div>
            </div>

            <div className="card" style={{ padding: '16px', borderTop: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Success Reliability</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                {statusData?.summary?.automation_success_rate ?? 100}%
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{statusData?.summary?.success_jobs ?? 0} successful executions</div>
            </div>

            <div className="card" style={{ padding: '16px', borderTop: '4px solid #ef4444' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Failed / Attention</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                {statusData?.summary?.failed_jobs ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>recoverable retry queue</div>
            </div>
          </div>

          {/* Integration Status Cards */}
          <div className="card" style={{ padding: '18px', marginBottom: '24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#ea580c" />
              <span>External Service Integrations Health Status</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {statusData?.integrations && Object.entries(statusData.integrations).map(([key, item]) => (
                <div key={key} style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{item.name}</span>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, background: item.configured ? '#dcfce7' : '#fef3c7', color: item.configured ? '#166534' : '#92400e' }}>
                      {item.configured ? 'READY' : 'SANDBOX'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{item.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('workflows')}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'workflows' ? '#ea580c' : '#64748b',
                borderBottom: activeTab === 'workflows' ? '2px solid #ea580c' : '2px solid transparent',
                marginBottom: '-2px'
              }}
            >
              Active Workflows ({workflows.length})
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'jobs' ? '#ea580c' : '#64748b',
                borderBottom: activeTab === 'jobs' ? '2px solid #ea580c' : '2px solid transparent',
                marginBottom: '-2px'
              }}
            >
              Durable Job Queue ({jobsData.total})
            </button>
          </div>

          {/* TAB 1: WORKFLOWS */}
          {activeTab === 'workflows' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Candidate ID</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Intern Name</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Internship Track</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Current Stage</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Last Execution</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Auto-Pilot</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                          No active workflows found. Import candidate spreadsheet to trigger automated onboarding.
                        </td>
                      </tr>
                    ) : (
                      workflows.map((wf) => (
                        <tr key={wf.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                            {wf.candidate_id}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{wf.intern_name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{wf.intern_email}</div>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                            {wf.role_title}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {getStageBadge(wf.current_stage)}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{wf.last_action || 'N/A'}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {wf.last_action_at ? new Date(wf.last_action_at).toLocaleString() : ''}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: wf.is_active ? '#15803d' : '#94a3b8' }}>
                              {wf.is_active ? '● Running' : '○ Paused'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedWorkflow(wf)}
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <History size={13} />
                                <span>History</span>
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleToggleWorkflow(wf)}
                                disabled={actionLoading}
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {wf.is_active ? <Pause size={13} /> : <Play size={13} />}
                                <span>{wf.is_active ? 'Pause' : 'Resume'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: JOBS QUEUE */}
          {activeTab === 'jobs' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Job ID</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Job Operation</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Target Intern</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Attempts</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>Next Execution</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsData.jobs.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                          Job queue is currently idle.
                        </td>
                      </tr>
                    ) : (
                      jobsData.jobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                            #{job.id}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{job.job_type}</div>
                            {job.last_error && (
                              <div style={{ fontSize: '11px', color: '#ef4444', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Error: {job.last_error}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>
                            {job.intern_name || `Intern #${job.intern_id || 'System'}`}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background:
                                job.status === 'SUCCESS' ? '#dcfce7' :
                                job.status === 'RUNNING' ? '#dbeafe' :
                                job.status === 'QUEUED' ? '#f1f5f9' :
                                job.status === 'RETRY_SCHEDULED' ? '#fef3c7' : '#fee2e2',
                              color:
                                job.status === 'SUCCESS' ? '#166534' :
                                job.status === 'RUNNING' ? '#1e40af' :
                                job.status === 'QUEUED' ? '#475569' :
                                job.status === 'RETRY_SCHEDULED' ? '#92400e' : '#991b1b'
                            }}>
                              {job.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                            {job.attempt_count} / {job.max_attempts}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                            {job.next_run_at ? new Date(job.next_run_at).toLocaleTimeString() : 'Immediate'}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            {(job.status === 'FAILED' || job.status === 'RETRY_SCHEDULED') && (
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleRetryJob(job.id)}
                                disabled={actionLoading}
                                style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#ea580c', color: '#ea580c' }}
                              >
                                <RotateCcw size={12} />
                                <span>Retry Now</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Workflow Step History Modal */}
          {selectedWorkflow && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px'
            }}>
              <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Workflow Trajectory: {selectedWorkflow.intern_name}</h3>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Candidate ID: {selectedWorkflow.candidate_id} | Track: {selectedWorkflow.role_title}</div>
                  </div>
                  <button
                    onClick={() => setSelectedWorkflow(null)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                  >
                    &times;
                  </button>
                </div>

                <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: '12px', paddingLeft: '16px' }}>
                  {selectedWorkflow.history.map((step, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: '18px' }}>
                      <div style={{
                        position: 'absolute',
                        left: '-23px',
                        top: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#ea580c',
                        border: '2px solid #fff'
                      }} />
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(step.timestamp).toLocaleString()}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{step.action} ({step.stage})</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{step.details}</div>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: 'right', marginTop: '20px' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedWorkflow(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
