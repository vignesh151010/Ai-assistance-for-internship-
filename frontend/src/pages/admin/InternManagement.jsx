import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Users,
  UserCheck,
  Award,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const InternManagement = () => {
  const [interns, setInterns] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [assigningMentorId, setAssigningMentorId] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [internRes, mentorRes] = await Promise.all([
        api.get('/interns'),
        api.get('/mentors')
      ]);
      setInterns(internRes.data);
      setMentors(mentorRes.data);
    } catch (err) {
      console.error('Failed to load interns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAssignModal = (intern) => {
    setSelectedIntern(intern);
    setAssigningMentorId(intern.assigned_mentor_id || (mentors[0]?.id || ''));
    setShowAssignModal(true);
  };

  const handleSaveMentor = async () => {
    if (!selectedIntern || !assigningMentorId) return;
    try {
      await api.put(`/interns/${selectedIntern.id}/assign-mentor?mentor_id=${assigningMentorId}`);
      setShowAssignModal(false);
      setMessage(`Mentor successfully assigned to ${selectedIntern.full_name}.`);
      loadData();
    } catch (err) {
      alert('Failed to assign mentor.');
    }
  };

  const handleApproveCompletion = async (internId) => {
    setApproving(true);
    try {
      const res = await api.post(`/completion/approve/${internId}`);
      setMessage(res.data.message);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Approval failed.');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div>Loading intern directory...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Intern Management Directory</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Monitor candidate milestones, assign mentors, and execute graduation approvals.
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

      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Candidate ID</th>
                <th>Intern Name & Email</th>
                <th>Role Track</th>
                <th>Assigned Mentor</th>
                <th>Progress</th>
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
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{intern.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{intern.email}</div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{intern.role_title}</td>
                  <td>
                    {intern.mentor_name ? (
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{intern.mentor_name}</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 500 }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ width: '160px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Milestones</span>
                      <strong>{Math.round(intern.progress_percentage)}%</strong>
                    </div>
                    <div className="progress-container">
                      <div className="progress-fill" style={{ width: `${intern.progress_percentage}%` }}></div>
                    </div>
                  </td>
                  <td>
                    {intern.status === 'COMPLETED' ? (
                      <span className="badge badge-success">Completed</span>
                    ) : intern.completion_eligible ? (
                      <span className="badge badge-primary">Graduation Ready</span>
                    ) : (
                      <span className="badge badge-info">{intern.status}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenAssignModal(intern)}
                        className="btn btn-secondary btn-sm"
                        title="Assign or reassign mentor"
                      >
                        <UserCheck size={14} />
                        <span>Mentor</span>
                      </button>

                      {intern.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => handleApproveCompletion(intern.id)}
                          disabled={approving}
                          className="btn btn-success btn-sm"
                          title="Approve completion and deliver PDF certificate"
                        >
                          <Award size={14} />
                          <span>Approve & Certify</span>
                        </button>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '11px' }}>
                          Certified
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mentor Assignment Modal */}
      {showAssignModal && selectedIntern && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Assign Mentor to Intern
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Assigning mentor for: <strong>{selectedIntern.full_name}</strong> ({selectedIntern.role_title})
            </p>

            <div className="form-group">
              <label className="form-label">Select Registered Mentor</label>
              <select
                className="form-select"
                value={assigningMentorId}
                onChange={(e) => setAssigningMentorId(e.target.value)}
              >
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} — {m.designation} ({m.department})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMentor}
                className="btn btn-primary"
              >
                Save Mentor Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
