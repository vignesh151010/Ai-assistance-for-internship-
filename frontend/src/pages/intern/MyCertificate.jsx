import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  FileText,
  Briefcase,
  BookOpen,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const MyCertificate = () => {
  const [certificates, setCertificates] = useState([]);
  const [careerData, setCareerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [certsRes, careerRes] = await Promise.allSettled([
          api.get('/certificates'),
          api.get('/career-guidance/me')
        ]);
        if (certsRes.status === 'fulfilled') setCertificates(certsRes.value.data);
        if (careerRes.status === 'fulfilled') setCareerData(careerRes.value.data);
      } catch (err) {
        console.error('Failed to load certificates or career guidance', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownload = async (certId, filename) => {
    try {
      const res = await api.get(`/certificates/${certId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download certificate PDF.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
        Loading credentials and AI career guidance...
      </div>
    );
  }

  const cert = certificates.length > 0 ? certificates[0] : null;
  const guidance = careerData?.guidance || null;

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
          Accredited Credentials & AI Career Development
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Official institutional certificates, SHA-256 verification, and evidence-based career development guidance.
        </p>
      </div>

      {/* Certificate Status Section */}
      {cert ? (
        /* Verified Certificate Card */
        <div className="card" style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)',
          border: '2px solid #fed7aa',
          borderRadius: '16px',
          padding: '36px',
          marginBottom: '32px',
          position: 'relative',
          boxShadow: '0 10px 30px rgba(234, 88, 12, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Award size={32} color="#ea580c" />
                <span className="badge badge-success" style={{ fontSize: '12px' }}>Verified & Accredited</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                Certificate of Internship Completion
              </h2>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                Awarded to <strong>{cert.intern_name}</strong> for excellence as <strong>{cert.internship_role}</strong>
              </div>
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>
                Certificate ID: <code style={{ fontWeight: 700, color: '#ea580c' }}>{cert.certificate_id}</code> &bull; Issued: {new Date(cert.completion_date).toLocaleDateString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleDownload(cert.certificate_id, cert.pdf_filename)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={16} />
                <span>Download Vector PDF</span>
              </button>

              <Link
                to={`/verify-certificate/${cert.certificate_id}`}
                target="_blank"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', borderColor: '#a7f3d0', backgroundColor: '#ffffff' }}
              >
                <ShieldCheck size={16} color="#059669" />
                <span>Public Verification URL</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* In-Progress Notification */
        <div className="card" style={{
          textAlign: 'center',
          padding: '36px 24px',
          marginBottom: '32px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: '#ffedd5', color: '#ea580c', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
          }}>
            <Lock size={24} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
            Internship in Active Progress
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '500px', margin: '8px auto 20px' }}>
            Complete your milestone deliverables and pass your live Google Meet mentor evaluation to automatically unlock your official accredited certificate.
          </p>
          <Link to="/intern/tasks" className="btn btn-primary">
            <span>View Current Tasks & Roadmap</span>
            <ArrowRight size={16} style={{ marginLeft: '6px' }} />
          </Link>
        </div>
      )}

      {/* AI Career & Interview Guidance */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#ea580c'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div className="card-title">AI Career Impact & Professional Portfolio Roadmap</div>
              <div className="card-subtitle">
                Synthesized dynamically from your actual submitted deliverables and mentor reviews
              </div>
            </div>
          </div>
        </div>

        {guidance?.congratulations && (
          <div style={{
            marginTop: '20px',
            padding: '16px 20px',
            backgroundColor: '#f0fdf4',
            borderRadius: '10px',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '14px',
            fontWeight: 600
          }}>
            {guidance.congratulations}
          </div>
        )}

        {guidance?.work_summary && (
          <p style={{ fontSize: '14px', color: '#475569', margin: '16px 0 24px', lineHeight: 1.6 }}>
            {guidance.work_summary}
          </p>
        )}

        {/* Guidance 4-Box Grid */}
        <div className="grid-2" style={{ gap: '20px', marginTop: '16px' }}>
          
          {/* Box 1: Tailored Resume Bullets */}
          <div style={{ padding: '22px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '14px' }}>
              <FileText size={18} color="#ea580c" />
              <span>Tailored Resume Impact Statements</span>
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: 1.6 }}>
              {guidance?.resume_bullet_points?.map((bullet, idx) => (
                <li key={idx}>{bullet}</li>
              )) || (
                <>
                  <li>Architected and deployed full-lifecycle solutions fulfilling production acceptance criteria.</li>
                  <li>Collaborated with senior engineering mentors through iterative code reviews and actionable feedback.</li>
                  <li>Implemented automated test verification and defensive validations across milestone deliverables.</li>
                </>
              )}
            </ul>
          </div>

          {/* Box 2: Portfolio Project Recommendations */}
          <div style={{ padding: '22px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '14px' }}>
              <Briefcase size={18} color="#10b981" />
              <span>Portfolio & GitHub Showcase Tips</span>
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: 1.6 }}>
              {guidance?.portfolio_tips?.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              )) || (
                <>
                  <li>Publish your repository on GitHub with clean architectural diagrams and test execution badges.</li>
                  <li>Write a technical case study detailing the engineering trade-offs made during mentor revision cycles.</li>
                </>
              )}
            </ul>
          </div>

          {/* Box 3: Technical Interview Preparation */}
          <div style={{ padding: '22px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '14px' }}>
              <HelpCircle size={18} color="#3b82f6" />
              <span>Interview Readiness & Behavioral Questions</span>
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: 1.6 }}>
              {guidance?.interview_readiness?.map((q, idx) => (
                <li key={idx}>{q}</li>
              )) || (
                <>
                  <li>Be ready to explain your modular architecture and why you chose specific libraries and frameworks.</li>
                  <li>Practice discussing how you incorporated mentor review recommendations under strict deadlines.</li>
                </>
              )}
            </ul>
          </div>

          {/* Box 4: Next Learning Roadmap */}
          <div style={{ padding: '22px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '14px' }}>
              <BookOpen size={18} color="#8b5cf6" />
              <span>Next Technical Learning Milestones</span>
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: 1.6 }}>
              {guidance?.next_learning_steps?.map((step, idx) => (
                <li key={idx}>{step}</li>
              )) || (
                <>
                  <li>Deep dive into containerized microservices and automated CI/CD pipelines (Docker & GitHub Actions).</li>
                  <li>Explore system design principles for distributed state, caching, and database indexing.</li>
                </>
              )}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
