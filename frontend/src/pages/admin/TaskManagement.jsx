import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  CheckSquare,
  Plus,
  Sparkles,
  Mail,
  CheckCircle,
  Clock,
  ListOrdered,
  AlertTriangle,
  ChevronRight,
  Download
} from 'lucide-react';

export const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskAnalysis, setSelectedTaskAnalysis] = useState(null);
  const [analyzingTaskId, setAnalyzingTaskId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [message, setMessage] = useState('');

  // Create task state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [skills, setSkills] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskRes, assignRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/tasks/assignments')
      ]);
      setTasks(taskRes.data);
      setAssignments(assignRes.data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', {
        title,
        description,
        raw_requirements: requirements,
        expected_deliverables: deliverables,
        required_skills: skills
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setRequirements('');
      setDeliverables('');
      setSkills('');
      setMessage('Task created successfully.');
      loadData();
    } catch (err) {
      alert('Failed to create task.');
    }
  };

  const handleViewAIAnalysis = async (taskId) => {
    setAnalyzingTaskId(taskId);
    try {
      const res = await api.get(`/tasks/${taskId}/ai-analysis`);
      setSelectedTaskAnalysis(res.data);
    } catch (err) {
      alert('Failed to generate or retrieve AI task analysis.');
    } finally {
      setAnalyzingTaskId(null);
    }
  };

  const handleSendEmail = async (assignmentId) => {
    setSendingEmailId(assignmentId);
    try {
      const res = await api.post(`/tasks/assignments/${assignmentId}/send-email`);
      setMessage(res.data.message);
      loadData();
    } catch (err) {
      alert('Failed to send task assignment email.');
    } finally {
      setSendingEmailId(null);
    }
  };

  if (loading) return <div>Loading tasks and AI analysis engine...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Task Specifications & AI Analysis Engine</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Curate technical specifications, inspect AI-generated beginner roadmaps, and dispatch tailored onboarding emails.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href="http://localhost:8000/api/imports/download-template"
            download="candidate_task_assignment.xlsx"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <Download size={16} />
            <span>Download Excel Template (.xlsx)</span>
          </a>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>New Task Specification</span>
          </button>
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

      {/* Assigned Tasks & Email Dispatch Table */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Candidate Task Assignments & Email Dispatch</div>
            <div className="card-subtitle">Personalized onboarding emails and submission tracking</div>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Assignment #</th>
                <th>Task Title</th>
                <th>Intern ID</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Personalized Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assign) => (
                <tr key={assign.id}>
                  <td style={{ fontWeight: 600 }}>#{assign.id}</td>
                  <td style={{ fontWeight: 600, color: '#1e293b' }}>{assign.task?.title}</td>
                  <td>INT-{assign.intern_id}</td>
                  <td>
                    {assign.deadline ? (
                      <span style={{ fontSize: '13px' }}>
                        {new Date(assign.deadline).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <span className="badge badge-info">{assign.status}</span>
                  </td>
                  <td>
                    {assign.is_email_sent ? (
                      <span className="badge badge-success">
                        <CheckCircle size={12} />
                        <span>Dispatched</span>
                      </span>
                    ) : (
                      <span className="badge badge-warning">
                        <Clock size={12} />
                        <span>Pending Dispatch</span>
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleViewAIAnalysis(assign.task_id)}
                        disabled={analyzingTaskId === assign.task_id}
                        className="btn btn-secondary btn-sm"
                        title="View AI roadmap and acceptance criteria"
                      >
                        <Sparkles size={14} color="#6366f1" />
                        <span>{analyzingTaskId === assign.task_id ? 'Analyzing...' : 'AI Roadmap'}</span>
                      </button>

                      <button
                        onClick={() => handleSendEmail(assign.id)}
                        disabled={sendingEmailId === assign.id}
                        className="btn btn-primary btn-sm"
                        title="Dispatch personalized task email"
                      >
                        <Mail size={14} />
                        <span>{sendingEmailId === assign.id ? 'Sending...' : 'Send Email'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Task Catalog */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Master Task Catalog</div>
            <div className="card-subtitle">Approved core curriculum projects</div>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Title</th>
                <th>Description</th>
                <th>Required Skills</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>#{t.id}</td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{t.title}</td>
                  <td style={{ maxWidth: '350px', fontSize: '13px', color: '#475569' }}>{t.description}</td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>{t.required_skills || 'General'}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleViewAIAnalysis(t.id)}
                      disabled={analyzingTaskId === t.id}
                      className="btn btn-secondary btn-sm"
                    >
                      <Sparkles size={14} color="#6366f1" />
                      <span>{analyzingTaskId === t.id ? 'Analyzing...' : 'AI Roadmap'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: AI Task Analysis Detail */}
      {selectedTaskAnalysis && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#4338ca'
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    AI-Generated Implementation Roadmap
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Model: {selectedTaskAnalysis.model_name} &bull; Prompt Version: {selectedTaskAnalysis.prompt_version}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTaskAnalysis(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                Beginner-Friendly Explanation
              </h4>
              <p style={{ fontSize: '13px', color: '#14532d', lineHeight: 1.6 }}>
                {selectedTaskAnalysis.beginner_explanation}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
                Objective & Business Purpose
              </h4>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                <strong>Objective:</strong> {selectedTaskAnalysis.objective}
              </p>
              {selectedTaskAnalysis.business_purpose && (
                <p style={{ fontSize: '13px', color: '#475569' }}>
                  <strong>Business Context:</strong> {selectedTaskAnalysis.business_purpose}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#1e293b' }}>
                Step-by-Step Implementation Roadmap
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedTaskAnalysis.steps.map((st) => (
                  <div key={st.step_number} style={{
                    padding: '12px 16px', backgroundColor: '#f8fafc',
                    borderRadius: '8px', border: '1px solid #e2e8f0',
                    display: 'flex', gap: '12px', alignItems: 'flex-start'
                  }}>
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      backgroundColor: '#4338ca', color: 'white', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', flexShrink: 0
                    }}>
                      {st.step_number}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{st.title}</div>
                      <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{st.description}</div>
                      {st.tools && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          {st.tools.map(tool => (
                            <span key={tool} className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', color: '#1e293b' }}>
                Strict Acceptance Criteria Checklist
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedTaskAnalysis.acceptance_criteria.map((ac) => (
                  <div key={ac.id} style={{
                    padding: '10px 14px', backgroundColor: '#f1f5f9',
                    borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{ac.criterion_name}: </span>
                      <span style={{ fontSize: '13px', color: '#475569' }}>{ac.description}</span>
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: '11px', flexShrink: 0 }}>
                      {ac.is_mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Task Specification */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              Create New Task Specification
            </h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed In-Memory Caching Proxy"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed project summary..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Raw Requirements (Company Specific)</label>
                <textarea
                  className="form-textarea"
                  required
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="List essential acceptance specs..."
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Expected Deliverables</label>
                  <input
                    type="text"
                    className="form-input"
                    value={deliverables}
                    onChange={(e) => setDeliverables(e.target.value)}
                    placeholder="e.g. Source code, unit tests, README"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Required Skills</label>
                  <input
                    type="text"
                    className="form-input"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. Python, Redis, Pytest"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Specification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
