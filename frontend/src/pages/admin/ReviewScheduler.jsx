import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Calendar,
  Plus,
  Video,
  Key,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const ReviewScheduler = () => {
  const [reviews, setReviews] = useState([]);
  const [interns, setInterns] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [internId, setInternId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [reviewType, setReviewType] = useState('PROGRESS');
  const [scheduling, setScheduling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [revRes, intRes, menRes] = await Promise.all([
        api.get('/reviews'),
        api.get('/interns'),
        api.get('/mentors')
      ]);
      setReviews(revRes.data);
      setInterns(intRes.data);
      setMentors(menRes.data);
      if (intRes.data.length > 0) setInternId(intRes.data[0].id);
      if (menRes.data.length > 0) setMentorId(menRes.data[0].id);
    } catch (err) {
      console.error('Failed to load review calendar data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Default scheduled date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduling(true);
    try {
      const fullDate = `${scheduledDate}T${startTime}:00`;
      const res = await api.post('/reviews/schedule', {
        intern_id: parseInt(internId),
        mentor_id: parseInt(mentorId),
        review_type: reviewType,
        scheduled_date: fullDate,
        start_time: startTime,
        end_time: endTime,
        timezone: 'Asia/Kolkata'
      });
      setShowScheduleModal(false);
      setMessage(`Review scheduled! Google Meet link generated: ${res.data.meeting_url}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to schedule review.');
    } finally {
      setScheduling(false);
    }
  };

  if (loading) return <div>Loading review scheduling engine...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Review Meeting Scheduling & Meet Integration</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Coordinate Google Meet milestone reviews with secure 6-digit OTP identity verification.
          </p>
        </div>
        <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Schedule Review Session</span>
        </button>
      </div>

      {message && (
        <div style={{
          backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0',
          color: '#065f46', padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Review #</th>
                <th>Candidate / Intern</th>
                <th>Assigned Mentor</th>
                <th>Scheduled Time (Asia/Kolkata)</th>
                <th>Google Meet Conference</th>
                <th>Verification Code</th>
                <th>Attendance</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>#{r.id}</td>
                  <td style={{ fontWeight: 600 }}>{r.intern_name}</td>
                  <td>{r.mentor_name}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {new Date(r.scheduled_date).toLocaleDateString()}
                    </div>
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
                        style={{ display: 'inline-flex', gap: '6px', color: '#0284c7', borderColor: '#bae6fd' }}
                      >
                        <Video size={14} color="#0284c7" />
                        <span>Join Google Meet</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '12px' }}>Pending Configuration</span>
                    )}
                  </td>
                  <td>
                    {r.verification_code ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Key size={14} color="#d97706" />
                        <code style={{ fontWeight: 700, letterSpacing: '1px', color: '#b45309' }}>
                          {r.verification_code}
                        </code>
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    {r.attendance_status === 'VERIFIED' ? (
                      <span className="badge badge-success">
                        <ShieldCheck size={12} />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="badge badge-warning">
                        <Clock size={12} />
                        <span>{r.attendance_status}</span>
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-primary">{r.review_outcome}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              Schedule Milestone Review Session
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Creates a Google Calendar conference with automatic Google Meet generation and attendance OTP dispatch.
            </p>

            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Intern</label>
                <select
                  className="form-select"
                  value={internId}
                  onChange={(e) => setInternId(e.target.value)}
                  required
                >
                  {interns.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.full_name} ({i.role_title}) — {i.candidate_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reviewing Mentor</label>
                <select
                  className="form-select"
                  value={mentorId}
                  onChange={(e) => setMentorId(e.target.value)}
                  required
                >
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} — {m.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Review Type</label>
                  <select
                    className="form-select"
                    value={reviewType}
                    onChange={(e) => setReviewType(e.target.value)}
                  >
                    <option value="INITIAL">Initial Scope Review</option>
                    <option value="PROGRESS">Mid-Term Progress Review</option>
                    <option value="FINAL">Final Graduation Review</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Scheduled Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Time (24h)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time (24h)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="btn btn-primary"
                >
                  {scheduling ? 'Scheduling & Creating Meet...' : 'Confirm & Send Invitations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
