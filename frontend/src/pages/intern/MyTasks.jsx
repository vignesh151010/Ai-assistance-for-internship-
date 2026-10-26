import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  CheckSquare,
  Sparkles,
  Upload,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

export const MyTasks = () => {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [taskAnalysis, setTaskAnalysis] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // File upload state
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/assignments');
      setAssignments(res.data);
      if (res.data.length > 0) {
        selectTask(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load intern tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTask = async (assign) => {
    setSelectedAssignment(assign);
    setUploadSuccess(null);
    try {
      const [aiRes, subRes] = await Promise.all([
        api.get(`/tasks/${assign.task_id}/ai-analysis`),
        api.get(`/submissions/by-assignment/${assign.id}`)
      ]);
      setTaskAnalysis(aiRes.data);
      setSubmissions(subRes.data);
    } catch (err) {
      console.error('Failed to load task details', err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !selectedAssignment) return;

    setUploading(true);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('assignment_id', selectedAssignment.id);
    formData.append('intern_notes', notes);
    files.forEach(f => {
      formData.append('files', f);
    });

    try {
      const res = await api.post('/submissions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess(res.data);
      setFiles([]);
      setNotes('');
      // Reload submissions
      const subRes = await api.get(`/submissions/by-assignment/${selectedAssignment.id}`);
      setSubmissions(subRes.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Submission upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div>Loading tasks and roadmaps...</div>;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>My Assigned Tasks & AI Roadmap</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Inspect detailed implementation roadmaps, upload milestone deliverables, and view automated evaluations.
        </p>
      </div>

      {/* Task Selector Tabs if multiple */}
      {assignments.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {assignments.map(a => (
            <button
              key={a.id}
              onClick={() => selectTask(a)}
              className={`btn btn-sm ${selectedAssignment?.id === a.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {a.task?.title}
            </button>
          ))}
        </div>
      )}

      {selectedAssignment && taskAnalysis && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '28px' }}>
          {/* Left: Task Specifications & Step-by-Step AI Roadmap */}
          <div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedAssignment.task?.title}
                </h2>
                <span className="badge badge-primary">{selectedAssignment.status}</span>
              </div>

              {/* Beginner friendly explanation card */}
              <div style={{
                backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
                padding: '16px', borderRadius: '10px', marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                  <Sparkles size={16} />
                  <span>Beginner-Friendly Explanation</span>
                </div>
                <p style={{ fontSize: '13px', color: '#14532d', lineHeight: 1.6 }}>
                  {taskAnalysis.beginner_explanation}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Objective</h4>
                <p style={{ fontSize: '13px', color: '#475569' }}>{taskAnalysis.objective}</p>
              </div>

              {/* Steps */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                  Recommended Step-by-Step Plan:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {taskAnalysis.steps.map(s => (
                    <div key={s.step_number} style={{
                      padding: '12px 14px', backgroundColor: '#f8fafc',
                      borderRadius: '8px', border: '1px solid #e2e8f0',
                      display: 'flex', gap: '12px', alignItems: 'flex-start'
                    }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        backgroundColor: '#4338ca', color: 'white', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', flexShrink: 0
                      }}>
                        {s.step_number}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{s.title}</div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{s.description}</div>
                        {s.tools && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            {s.tools.map(tool => (
                              <span key={tool} className="badge badge-info" style={{ fontSize: '10px', padding: '1px 6px' }}>
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

              {/* Acceptance Criteria */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                  Mandatory Acceptance Criteria
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {taskAnalysis.acceptance_criteria.map(ac => (
                    <div key={ac.id} style={{
                      padding: '10px 14px', backgroundColor: '#f1f5f9',
                      borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{ac.criterion_name}: </strong>
                        <span style={{ fontSize: '13px', color: '#475569' }}>{ac.description}</span>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                        {ac.is_mandatory ? 'Required' : 'Bonus'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Upload Dropzone & Submission History */}
          <div>
            {/* Upload Deliverable Card */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Upload Project Submission</div>
                  <div className="card-subtitle">Source code archives, PDFs, or images</div>
                </div>
                <Upload size={20} color="#4338ca" />
              </div>

              <form onSubmit={handleUploadSubmit}>
                <div className="form-group">
                  <label className="form-label">Submission Notes & Implementation Summary</label>
                  <textarea
                    className="form-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Briefly explain what you built and how to test it..."
                    style={{ minHeight: '70px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select Project Files (Multi-file supported)</label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    required
                    style={{ fontSize: '13px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Allowed: .py, .js, .jsx, .ts, .tsx, .pdf, .zip, .html, .css, .md (Max 20MB)
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || files.length === 0}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  {uploading ? 'Analyzing Files with AI...' : 'Submit Deliverable & Run Evaluation'}
                </button>
              </form>

              {uploadSuccess && (
                <div style={{
                  marginTop: '16px', padding: '14px', borderRadius: '8px',
                  backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700, fontSize: '13px' }}>
                    <CheckCircle2 size={16} />
                    <span>Submission v{uploadSuccess.version} Evaluated!</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                    {uploadSuccess.ai_evaluation?.overall_feedback}
                  </p>
                </div>
              )}
            </div>

            {/* Submission Version History */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Submission History & AI Scores</div>
                  <div className="card-subtitle">All submitted iterations for this task</div>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                  No submissions recorded yet. Upload your files above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {submissions.map(sub => (
                    <div key={sub.id} style={{
                      padding: '14px', borderRadius: '8px',
                      backgroundColor: '#f8fafc', border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                          Version {sub.version}
                        </span>
                        {sub.ai_evaluation && (
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>
                            Score: {sub.ai_evaluation.overall_score}/100
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                        Submitted on: {new Date(sub.created_at).toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {sub.files?.map(f => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
                            <FileCode size={13} color="#4338ca" />
                            <span>{f.original_filename} ({(f.file_size_bytes / 1024).toFixed(1)} KB)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
