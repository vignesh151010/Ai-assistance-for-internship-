import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  CheckSquare,
  Calendar,
  Award,
  Video,
  Key,
  ChevronRight,
  ShieldCheck,
  Download,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export const InternDashboard = () => {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInternData = async () => {
      try {
        const [statsRes, tasksRes, revRes] = await Promise.all([
          api.get('/dashboard/intern-stats'),
          api.get('/tasks/assignments'),
          api.get('/reviews')
        ]);
        setStats(statsRes.data);
        setTasks(tasksRes.data);
        setReviews(revRes.data);
      } catch (err) {
        console.error('Failed to load intern dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInternData();
  }, []);

  if (loading) return <div>Loading your intern portal...</div>;

  const nextReview = reviews.find(r => r.meeting_status === 'SCHEDULED');

  return (
    <div>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #312e81, #1e3a8a)',
        borderRadius: '16px', padding: '32px', color: 'white',
        marginBottom: '28px', boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
                {stats?.candidate_id}
              </span>
              <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{stats?.role_title}</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px' }}>
              Welcome to Your Internship Journey
            </h1>
            <p style={{ color: '#93c5fd', fontSize: '14px', marginTop: '4px' }}>
              Follow your AI-guided roadmap, submit milestone deliverables, and prepare for mentor reviews.
            </p>
          </div>

          <div style={{ textAlign: 'right', minWidth: '220px' }}>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
              Program Milestone Progress
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#67e8f9' }}>
              {Math.round(stats?.progress_percentage || 0)}%
            </div>
            <div className="progress-container" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', height: '8px' }}>
              <div className="progress-fill" style={{ width: `${stats?.progress_percentage || 0}%`, background: '#67e8f9' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Graduation Banner if Completed */}
      {stats?.has_certificate && (
        <div style={{
          backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0',
          padding: '20px 24px', borderRadius: '12px', marginBottom: '28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Award size={36} color="#059669" />
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#065f46' }}>
                Internship Successfully Completed!
              </h3>
              <p style={{ fontSize: '13px', color: '#047857' }}>
                Your official accredited Certificate <strong>{stats.certificate_id}</strong> is issued and verified.
              </p>
            </div>
          </div>
          <Link to="/intern/certificate" className="btn btn-success">
            <Award size={16} />
            <span>View Certificate & Career Tips</span>
          </Link>
        </div>
      )}

      {/* Grid: Next Review & Tasks */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* Next Scheduled Review Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Next Mentor Review Meeting</div>
              <div className="card-subtitle">Live Google Meet discussion & verification</div>
            </div>
            <Calendar size={20} color="#4338ca" />
          </div>

          {nextReview ? (
            <div>
              <div style={{
                backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
                padding: '16px', borderRadius: '8px', marginBottom: '16px'
              }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#166534' }}>
                  {new Date(nextReview.scheduled_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: '13px', color: '#15803d', marginTop: '2px' }}>
                  Time: {nextReview.start_time} - {nextReview.end_time} ({nextReview.timezone}) &bull; Mentor: {nextReview.mentor_name}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {nextReview.meeting_url && (
                  <a
                    href={nextReview.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    <Video size={16} />
                    <span>Join Google Meet</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                <Link to="/intern/reviews" className="btn btn-secondary">
                  <Key size={16} />
                  <span>Verify OTP Check-in</span>
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
              No review meetings currently scheduled. Your mentor will schedule your next milestone check.
            </div>
          )}
        </div>

        {/* Quick Task Summary Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Assigned Projects & Milestones</div>
              <div className="card-subtitle">Active technical challenges</div>
            </div>
            <CheckSquare size={20} color="#2563eb" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasks.map(t => (
              <div key={t.id} style={{
                padding: '12px 16px', backgroundColor: '#f8fafc',
                borderRadius: '8px', border: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{t.task?.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Deadline: {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Within 14 days'}
                  </div>
                </div>
                <span className={`badge ${t.status === 'APPROVED' ? 'badge-success' : 'badge-primary'}`}>
                  {t.status}
                </span>
              </div>
            ))}

            <Link to="/intern/tasks" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4338ca', fontWeight: 600, textDecoration: 'none', marginTop: '6px' }}>
              <Sparkles size={14} />
              <span>View full AI task roadmap & upload submission</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
