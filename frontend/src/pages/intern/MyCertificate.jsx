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
  BookOpen
} from 'lucide-react';

export const MyCertificate = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const res = await api.get('/certificates');
        setCertificates(res.data);
      } catch (err) {
        console.error('Failed to load certificates', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCerts();
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
    } catch (err) {
      alert('Failed to download certificate PDF.');
    }
  };

  if (loading) return <div>Loading certificate and career guidance...</div>;

  const cert = certificates.length > 0 ? certificates[0] : null;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Accredited Certificate & Career Guidance</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Official credentials and tailored AI-generated portfolio and interview preparation.
        </p>
      </div>

      {cert ? (
        <div>
          {/* Certificate Showcase Card */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '2px solid #e2e8f0',
            borderRadius: '16px',
            padding: '36px',
            marginBottom: '32px',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Award size={32} color="#4338ca" />
                  <span className="badge badge-success" style={{ fontSize: '12px' }}>Verified & Accredited</span>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                  Certificate of Internship Completion
                </h2>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                  Awarded to <strong>{cert.intern_name}</strong> for excellence as <strong>{cert.internship_role}</strong>
                </div>
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>
                  Certificate Identifier: <code style={{ fontWeight: 700, color: '#4338ca' }}>{cert.certificate_id}</code> &bull; Issued on: {new Date(cert.completion_date).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
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
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', borderColor: '#a7f3d0' }}
                >
                  <ShieldCheck size={16} color="#059669" />
                  <span>Public Registry Link</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* AI Career & Interview Guidance */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#4338ca'
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="card-title">AI Career Impact & Resume Guidance</div>
                  <div className="card-subtitle">Derived from your verified milestone deliveries</div>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '20px' }}>
              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>
                  <FileText size={18} color="#4338ca" />
                  <span>Tailored Resume Impact Statements</span>
                </div>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: 1.6 }}>
                  <li>Architected and deployed full-lifecycle solutions for <strong>{cert.internship_role}</strong> track, fulfilling production standards and acceptance criteria.</li>
                  <li>Collaborated with senior engineering mentors through iterative code reviews, addressing complex technical improvement cycles.</li>
                  <li>Implemented robust validation, automated test verification, and technical documentation across all milestone deliverables.</li>
                </ul>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>
                  <Briefcase size={18} color="#059669" />
                  <span>Portfolio & Interview Advice</span>
                </div>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: 1.6 }}>
                  <li>Publish your repository on GitHub with clean diagrams, architectural summaries, and test execution badges.</li>
                  <li>In interviews, articulate the trade-offs you navigated when addressing mentor review improvement action plans.</li>
                  <li>Highlight your familiarity with automated CI/CD practices and multi-stage testing learned during this program.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Award size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
            Internship in Active Progress
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', margin: '8px auto 20px' }}>
            Complete your assigned milestones and pass your mentor reviews to unlock your accredited certificate.
          </p>
          <Link to="/intern/tasks" className="btn btn-primary">
            View Current Task Roadmap
          </Link>
        </div>
      )}
    </div>
  );
};
