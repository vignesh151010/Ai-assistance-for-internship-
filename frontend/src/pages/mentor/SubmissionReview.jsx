import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Send,
  MessageSquare,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Check,
  Award
} from 'lucide-react';

export const SubmissionReview = () => {
  const { internId } = useParams();
  const [intern, setIntern] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeReviewSession, setActiveReviewSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // AI Assistant Query state
  const [aiQuery, setAiQuery] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [askingAi, setAskingAi] = useState(false);

  // Mentor Decision Form state
  const [reviewOutcome, setReviewOutcome] = useState('APPROVED');
  const [mentorNotes, setMentorNotes] = useState('');
  const [internResponses, setInternResponses] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState('');

  // Improvement actions
  const [improvements, setImprovements] = useState([
    { issue_description: '', required_correction: '', learning_resources: '' }
  ]);

  const loadInternWorkspace = async () => {
    setLoading(true);
    try {
      const [intRes, assignRes, revRes] = await Promise.all([
        api.get(`/interns/${internId}`),
        api.get(`/tasks/assignments?intern_id=${internId}`),
        api.get(`/reviews`)
      ]);
      setIntern(intRes.data);

      const internAssignments = assignRes.data;
      if (internAssignments.length > 0) {
        const primaryAssign = internAssignments[0];
        setAssignment(primaryAssign);

        // Fetch submissions for this assignment
        const subRes = await api.get(`/submissions/by-assignment/${primaryAssign.id}`);
        setSubmissions(subRes.data);
        if (subRes.data.length > 0) {
          setActiveSubmission(subRes.data[0]);
        }
      }

      // Filter reviews for this intern
      const internReviews = revRes.data.filter(r => r.intern_id === parseInt(internId));
      setReviews(internReviews);
      if (internReviews.length > 0) {
        setActiveReviewSession(internReviews[0]);
      }
    } catch (err) {
      console.error('Failed to load intern submission review workspace', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInternWorkspace();
  }, [internId]);

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || !activeReviewSession) return;
    setAskingAi(true);
    try {
      const res = await api.post(`/reviews/${activeReviewSession.id}/ai-assist`, {
        query: aiQuery
      });
      setAiAdvice(res.data.advice);
    } catch (err) {
      alert('AI assistant failed to generate guidance.');
    } finally {
      setAskingAi(false);
    }
  };

  const handleAddImprovementRow = () => {
    setImprovements([...improvements, { issue_description: '', required_correction: '', learning_resources: '' }]);
  };

  const handleImprovementChange = (index, field, value) => {
    const updated = [...improvements];
    updated[index][field] = value;
    setImprovements(updated);
  };

  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!activeReviewSession) {
      alert('Please schedule a review session for this candidate first.');
      return;
    }

    setSavingDecision(true);
    setDecisionSuccess('');
    try {
      const validImprovements = improvements.filter(i => i.issue_description.trim() && i.required_correction.trim());
      const res = await api.post(`/reviews/${activeReviewSession.id}/decision`, {
        review_outcome: reviewOutcome,
        mentor_notes: mentorNotes,
        intern_responses: internResponses,
        next_review_date: nextReviewDate ? `${nextReviewDate}T10:00:00` : null,
        improvement_actions: validImprovements
      });
      setDecisionSuccess(`Mentor decision recorded: ${reviewOutcome}. Action plan dispatched to ${intern.email}.`);
      loadInternWorkspace();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save review decision.');
    } finally {
      setSavingDecision(false);
    }
  };

  if (loading) return <div>Loading mentor review workspace...</div>;
  if (!intern) return <div>Intern record not found.</div>;

  const evaluation = activeSubmission?.ai_evaluation;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/mentor" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4338ca', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          <ArrowLeft size={16} />
          <span>Back to Mentor Hub</span>
        </Link>
      </div>

      {/* Intern Summary Card */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{intern.full_name}</h1>
              <span className="badge badge-primary">{intern.candidate_id}</span>
              <span className="badge badge-info">{intern.role_title}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Email: <strong>{intern.email}</strong> &bull; College: {intern.college || 'Engineering'}
            </div>
          </div>

          <div style={{ width: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span>Curriculum Completion</span>
              <strong>{Math.round(intern.progress_percentage)}%</strong>
            </div>
            <div className="progress-container">
              <div className="progress-fill" style={{ width: `${intern.progress_percentage}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {decisionSuccess && (
        <div style={{
          backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0',
          color: '#065f46', padding: '14px 18px', borderRadius: '10px',
          marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{decisionSuccess}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '28px' }}>
        {/* Left Column: Submissions & AI Evaluation Report */}
        <div>
          {/* Submission Deliverables & Versions */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Submitted Deliverables</div>
                <div className="card-subtitle">
                  Task: <strong>{assignment?.task?.title}</strong>
                </div>
              </div>
              {submissions.length > 1 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {submissions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSubmission(s)}
                      className={`btn btn-sm ${activeSubmission?.id === s.id ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      v{s.version}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeSubmission ? (
              <div>
                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                  <strong>Intern Notes:</strong> "{activeSubmission.intern_notes || 'No comments attached.'}"
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeSubmission.files?.map(f => (
                    <div key={f.id} style={{
                      padding: '10px 14px', backgroundColor: '#f8fafc',
                      borderRadius: '8px', border: '1px solid #e2e8f0',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileCode size={18} color="#4338ca" />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{f.original_filename}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {(f.file_size_bytes / 1024).toFixed(1)} KB &bull; Integrity scan: {f.scan_status}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '11px' }}>Clean</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                No deliverables submitted yet for this assignment.
              </div>
            )}
          </div>

          {/* AI Task Evaluation Engine Report */}
          {evaluation && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} color="#4338ca" />
                    <div className="card-title">AI Evidence-Based Evaluation Report</div>
                  </div>
                  <div className="card-subtitle">
                    Automated static analysis comparing files against original criteria
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#4338ca' }}>
                    {evaluation.overall_score}/100
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Technical Score</div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px',
                border: '1px solid #e2e8f0', marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Evaluation Summary
                </h4>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                  {evaluation.overall_feedback}
                </p>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#0f172a' }}>
                Criterion-by-Criterion Status & Evidence:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {evaluation.criteria?.map((crit, idx) => (
                  <div key={idx} style={{
                    padding: '16px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', backgroundColor: '#ffffff'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                        {crit.criterion_name}
                      </span>
                      <span className={`badge ${crit.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                        {crit.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                      <strong>Requirement:</strong> {crit.original_requirement}
                    </div>

                    <div style={{ fontSize: '13px', color: '#334155', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px' }}>
                      <strong>Evidence:</strong> {crit.evidence}
                    </div>

                    {crit.suggested_improvement && (
                      <div style={{ fontSize: '12px', color: '#b45309', backgroundColor: '#fffbeb', padding: '8px 12px', borderRadius: '6px' }}>
                        <strong>Suggested Improvement:</strong> {crit.suggested_improvement}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Live Assistant & Authoritative Mentor Decision */}
        <div>
          {/* AI Live Meeting Assistant */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#6366f1" />
                <div className="card-title">Live Review Assistant</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
              Ask the AI engine to clarify architectural choices or generate technical probing questions.
            </p>

            <form onSubmit={handleAskAI} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                className="form-input"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="e.g. Suggest 3 probing questions..."
                style={{ fontSize: '13px' }}
              />
              <button
                type="submit"
                disabled={askingAi || !aiQuery.trim()}
                className="btn btn-primary btn-sm"
              >
                <Send size={14} />
              </button>
            </form>

            {aiAdvice && (
              <div style={{
                backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe',
                padding: '14px', borderRadius: '8px', fontSize: '13px', color: '#4c1d95',
                whiteSpace: 'pre-line', lineHeight: 1.6
              }}>
                {aiAdvice}
              </div>
            )}
          </div>

          {/* Authoritative Mentor Review Decision Form */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Mentor Review Decision</div>
                <div className="card-subtitle">Authoritative human review & next steps</div>
              </div>
            </div>

            <form onSubmit={handleSubmitDecision}>
              <div className="form-group">
                <label className="form-label">Review Outcome Decision</label>
                <select
                  className="form-select"
                  value={reviewOutcome}
                  onChange={(e) => setReviewOutcome(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="APPROVED">Approved (Full Milestone Passed)</option>
                  <option value="APPROVED_WITH_MINOR_CHANGES">Approved with Minor Improvements</option>
                  <option value="CHANGES_REQUIRED">Changes Required (Action Plan)</option>
                  <option value="RESUBMISSION_REQUIRED">Resubmission Required</option>
                  <option value="ESCALATED">Escalated to Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mentor Meeting Notes & Technical Feedback</label>
                <textarea
                  className="form-textarea"
                  required
                  value={mentorNotes}
                  onChange={(e) => setMentorNotes(e.target.value)}
                  placeholder="Record what went well, discussion points, and architectural feedback..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Intern Live Responses (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={internResponses}
                  onChange={(e) => setInternResponses(e.target.value)}
                  placeholder="Intern explanations, responses, and questions..."
                  style={{ minHeight: '60px' }}
                />
              </div>

              {/* Action Plan / Improvements */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Required Improvement Actions</label>
                  <button
                    type="button"
                    onClick={handleAddImprovementRow}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    + Add Action
                  </button>
                </div>

                {improvements.map((imp, idx) => (
                  <div key={idx} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Issue Description (e.g. edge-case testing missing)"
                      value={imp.issue_description}
                      onChange={(e) => handleImprovementChange(idx, 'issue_description', e.target.value)}
                      style={{ fontSize: '12px', marginBottom: '6px', padding: '6px 10px' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Required Action (e.g. implement 4 boundary unit tests)"
                      value={imp.required_correction}
                      onChange={(e) => handleImprovementChange(idx, 'required_correction', e.target.value)}
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Next Review Date (Optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={nextReviewDate}
                  onChange={(e) => setNextReviewDate(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={savingDecision}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
              >
                {savingDecision ? 'Saving Decision & Sending Email...' : 'Save Decision & Send Improvement Plan'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
