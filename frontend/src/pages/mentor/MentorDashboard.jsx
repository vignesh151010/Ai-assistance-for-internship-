import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  Calendar,
  CheckSquare,
  Award,
  Video,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export const MentorDashboard = () => {
  const [stats, setStats] = useState(null);
  const [interns, setInterns] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentorData = async () => {
      try {
        const [statsRes, internsRes, reviewsRes] = await Promise.all([
          api.get('/dashboard/mentor-stats'),
          api.get('/interns'),
          api.get('/reviews')
        ]);
        setStats(statsRes.data);
        setInterns(internsRes.data);
        setReviews(reviewsRes.data);
      } catch (err) {
        console.error('Failed to load mentor dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMentorData();
  }, []);

  if (loading) return <div>Loading mentor mentorship hub...</div>;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Technical Mentorship Workspace</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Evaluate code submissions, lead AI-assisted live reviews, and guide intern growth.
        </p>
      </div>

      {/* Stats Widgets */}
      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <div className="stat-widget">
          <div className="stat-icon" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>
            <Users size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.assigned_interns_count || 0}</div>
            <div className="stat-label">Assigned Interns</div>
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <Calendar size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.pending_reviews_count || 0}</div>
            <div className="stat-label">Upcoming Review Meetings</div>
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckSquare size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.submissions_to_review || 0}</div>
            <div className="stat-label">Deliverables to Evaluate</div>
          </div>
        </div>
      </div>

      {/* Assigned Interns Table */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">My Assigned Interns</div>
            <div className="card-subtitle">Candidates actively mentored under your guidance</div>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Candidate ID</th>
                <th>Intern Name</th>
                <th>Role Track</th>
                <th>Curriculum Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interns.map((intern) => (
                <tr key={intern.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#4338ca' }}>
                    {intern.candidate_id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{intern.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{intern.email}</div>
                  </td>
                  <td>{intern.role_title}</td>
                  <td style={{ width: '160px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Progress</span>
                      <strong>{Math.round(intern.progress_percentage)}%</strong>
                    </div>
                    <div className="progress-container">
                      <div className="progress-fill" style={{ width: `${intern.progress_percentage}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">{intern.status}</span>
                  </td>
                  <td>
                    <Link
                      to={`/mentor/review-workspace/${intern.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      <span>Open Review Workspace</span>
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Scheduled Reviews */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upcoming Review Sessions</div>
            <div className="card-subtitle">Google Meet conferences and verified attendance check-ins</div>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Session #</th>
                <th>Intern</th>
                <th>Date & Time</th>
                <th>Meeting URL</th>
                <th>Verification Status</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>#{r.id}</td>
                  <td style={{ fontWeight: 600 }}>{r.intern_name}</td>
                  <td>
                    {new Date(r.scheduled_date).toLocaleDateString()} at {r.start_time} ({r.timezone})
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
                        <span>Launch Meet</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : 'Not Configured'}
                  </td>
                  <td>
                    {r.attendance_status === 'VERIFIED' ? (
                      <span className="badge badge-success">
                        <ShieldCheck size={12} />
                        <span>Verified Attendance</span>
                      </span>
                    ) : (
                      <span className="badge badge-warning">{r.attendance_status}</span>
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
    </div>
  );
};
