import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Bell,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Shield,
  Clock,
  Send
} from 'lucide-react';

export const NotificationsAudit = () => {
  const [tab, setTab] = useState('notifications'); // 'notifications' | 'audit'
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifRes, auditRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/audit')
      ]);
      setNotifications(notifRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      console.error('Failed to load notifications or audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetry = async (logId) => {
    setRetryingId(logId);
    try {
      const res = await api.post(`/notifications/${logId}/retry`);
      setMessage(res.data.message);
      loadData();
    } catch (err) {
      alert('Retry failed.');
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) return <div>Loading notifications queue and audit trail...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Automation Queue & System Audit Logs</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Monitor email delivery reliability, retry transient failures, and inspect security audit records.
          </p>
        </div>
      </div>

      {message && (
        <div style={{
          backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0',
          color: '#065f46', padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setTab('notifications')}
          className={`btn ${tab === 'notifications' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Bell size={14} />
          <span>Notification Logs ({notifications.length})</span>
        </button>

        <button
          onClick={() => setTab('audit')}
          className={`btn ${tab === 'audit' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Shield size={14} />
          <span>System Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {tab === 'notifications' && (
        <div className="card">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Log #</th>
                  <th>Recipient</th>
                  <th>Notification Type</th>
                  <th>Subject</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Retries</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 600 }}>#{n.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{n.recipient_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{n.recipient_email}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{n.notification_type}</span>
                    </td>
                    <td style={{ fontSize: '13px', maxWidth: '280px' }}>{n.subject}</td>
                    <td style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>{n.provider}</td>
                    <td>
                      {n.status === 'SENT' || n.status === 'DELIVERED' ? (
                        <span className="badge badge-success">
                          <CheckCircle size={12} />
                          <span>{n.status}</span>
                        </span>
                      ) : (
                        <div>
                          <span className="badge badge-danger">
                            <AlertCircle size={12} />
                            <span>{n.status}</span>
                          </span>
                          {n.error_message && (
                            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px' }}>
                              {n.error_message}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{n.retry_count}</td>
                    <td>
                      <button
                        onClick={() => handleRetry(n.id)}
                        disabled={retryingId === n.id}
                        className="btn btn-secondary btn-sm"
                        title="Retry sending this message"
                      >
                        <RefreshCw size={12} className={retryingId === n.id ? 'animate-spin' : ''} />
                        <span>Retry</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Initiating User</th>
                  <th>Action</th>
                  <th>Resource Type</th>
                  <th>Resource ID</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>#{a.id}</td>
                    <td style={{ fontWeight: 600, color: '#4338ca' }}>{a.user_email}</td>
                    <td>
                      <span className="badge badge-primary">{a.action}</span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#334155' }}>{a.resource_type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{a.resource_id || '—'}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
