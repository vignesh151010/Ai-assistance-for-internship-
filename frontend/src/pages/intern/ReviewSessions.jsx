import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Calendar,
  Video,
  Key,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';

export const ReviewSessions = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reviews');
      setReviews(res.data);
    } catch (err) {
      console.error('Failed to load reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReview || !otpInput.trim()) return;

    setVerifying(true);
    setCheckInMessage('');
    try {
      const res = await api.post(`/reviews/${selectedReview.id}/check-in`, {
        verification_code: otpInput.trim()
      });
      setCheckInMessage(res.data.message);
      setSelectedReview(null);
      setOtpInput('');
      loadReviews();
    } catch (err) {
      alert(err.response?.data?.detail || 'Verification code failed. Please check your code.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <div>Loading review sessions...</div>;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Review Sessions & Identity Verification</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Access authorized Google Meet links, check in with your 6-digit verification code, and view mentor feedback.
        </p>
      </div>

      {checkInMessage && (
        <div style={{
          backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0',
          color: '#065f46', padding: '14px 18px', borderRadius: '10px',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <CheckCircle2 size={18} />
          <span>{checkInMessage}</span>
        </div>
      )}

      <div className="card">
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
            No review meetings currently scheduled.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Session #</th>
                  <th>Mentor</th>
                  <th>Scheduled Date & Time</th>
                  <th>Google Meet</th>
                  <th>Attendance Verification</th>
                  <th>Review Decision</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>#{r.id}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.mentor_name}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(r.scheduled_date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {r.start_time} - {r.end_time} ({r.timezone})
                      </div>
                    </td>
                    <td>
                      {r.meeting_url ? (
                        <a
                          href={r.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#0284c7', borderColor: '#bae6fd' }}
                        >
                          <Video size={14} color="#0284c7" />
                          <span>Join Meet</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : 'Pending'}
                    </td>
                    <td>
                      {r.attendance_status === 'VERIFIED' ? (
                        <span className="badge badge-success">
                          <ShieldCheck size={12} />
                          <span>Attendance Confirmed</span>
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <Clock size={12} />
                          <span>Check-in Required</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-primary">{r.review_outcome}</span>
                    </td>
                    <td>
                      {r.attendance_status !== 'VERIFIED' ? (
                        <button
                          onClick={() => setSelectedReview(r)}
                          className="btn btn-primary btn-sm"
                          title="Enter 6-digit verification code"
                        >
                          <Key size={14} />
                          <span>Enter OTP</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OTP Check-in Modal */}
      {selectedReview && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', backgroundColor: '#e0e7ff',
              color: '#4338ca', borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
            }}>
              <Key size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              Attendance Identity Check-In
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Please enter the 6-digit verification code sent to your registered email for this session.
            </p>

            <form onSubmit={handleCheckInSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  maxLength={6}
                  className="form-input"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="6-digit code e.g. 123456"
                  required
                  style={{
                    fontSize: '22px', textAlign: 'center', letterSpacing: '6px',
                    fontWeight: 700, padding: '12px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || otpInput.length < 6}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {verifying ? 'Verifying...' : 'Verify Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
