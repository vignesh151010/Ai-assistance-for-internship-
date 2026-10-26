import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  FileText
} from 'lucide-react';

export const CertificatesList = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/certificates');
      setCertificates(res.data);
    } catch (err) {
      console.error('Failed to load certificates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCerts();
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

  if (loading) return <div>Loading certificate registry...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Official Certificate Registry</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Permanent repository of accredited completion certificates and public verification records.
          </p>
        </div>
      </div>

      <div className="card">
        {certificates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <Award size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>No Certificates Issued Yet</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', maxWidth: '400px', margin: '4px auto 16px' }}>
              Approve eligible interns in the Intern Management Directory to generate and issue vector PDF credentials.
            </p>
            <Link to="/admin/interns" className="btn btn-primary btn-sm">
              Go to Intern Directory
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Certificate ID</th>
                  <th>Candidate / Recipient</th>
                  <th>Internship Track</th>
                  <th>Completion Date</th>
                  <th>Delivery Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#4338ca' }}>
                      {c.certificate_id}
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{c.intern_name}</td>
                    <td>{c.internship_role}</td>
                    <td>{new Date(c.completion_date).toLocaleDateString()}</td>
                    <td>
                      <span className="badge badge-success">
                        <CheckCircle size={12} />
                        <span>{c.delivery_status}</span>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleDownload(c.certificate_id, c.pdf_filename)}
                          className="btn btn-secondary btn-sm"
                          title="Download high-resolution PDF certificate"
                        >
                          <Download size={14} />
                          <span>PDF</span>
                        </button>

                        <Link
                          to={`/verify-certificate/${c.certificate_id}`}
                          target="_blank"
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#059669', borderColor: '#a7f3d0' }}
                          title="View on public verification portal"
                        >
                          <ShieldCheck size={14} color="#059669" />
                          <span>Verify</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
