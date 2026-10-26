import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { ShieldCheck, Search, Award, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

export const VerifyCertificate = () => {
  const { certId: paramCertId } = useParams();
  const [certId, setCertId] = useState(paramCertId || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performVerification = async (idToVerify) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/certificates/verify/${encodeURIComponent(idToVerify.trim())}`);
      setResult(res.data);
    } catch (err) {
      setResult({
        is_valid: false,
        status: 'ERROR',
        message: 'Could not connect to the credential verification registry.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramCertId) {
      performVerification(paramCertId);
    }
  }, [paramCertId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performVerification(certId);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '40px 20px',
      fontFamily: 'inherit'
    }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4338ca', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            <ArrowLeft size={16} />
            <span>Back to Portal Login</span>
          </Link>
        </div>

        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #4338ca, #3b82f6)',
            borderRadius: '16px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#ffffff', boxShadow: '0 8px 20px rgba(67, 56, 202, 0.25)'
          }}>
            <ShieldCheck size={36} />
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            Official Certificate Registry
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '6px', maxWidth: '480px', margin: '6px auto 24px' }}>
            Verify the authenticity of internship credentials and completion honors issued by the AI-Powered Mentorship Academy.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
            <input
              type="text"
              className="form-input"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="Enter Certificate ID e.g. CERT-2026-XXXX-XXXX"
              required
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
              {loading ? 'Verifying...' : (
                <>
                  <Search size={16} />
                  <span>Verify</span>
                </>
              )}
            </button>
          </form>

          {searched && result && (
            <div style={{
              marginTop: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'left',
              border: `1px solid ${result.is_valid ? '#a7f3d0' : '#fecaca'}`,
              backgroundColor: result.is_valid ? '#f0fdf4' : '#fef2f2'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                {result.is_valid ? (
                  <CheckCircle2 size={24} color="#059669" />
                ) : (
                  <XCircle size={24} color="#dc2626" />
                )}
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: result.is_valid ? '#065f46' : '#991b1b' }}>
                    {result.status === 'VERIFIED' ? 'Authentic Credential Verified' : 'Certificate Verification Failed'}
                  </h3>
                  <p style={{ fontSize: '13px', color: result.is_valid ? '#047857' : '#b91c1c' }}>
                    {result.message}
                  </p>
                </div>
              </div>

              {result.is_valid && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px',
                  backgroundColor: '#ffffff', padding: '18px', borderRadius: '8px', border: '1px solid #d1fae5'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Recipient Name</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{result.intern_name}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Internship Role</span>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#4338ca' }}>{result.internship_role}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Certificate Identifier</span>
                    <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#374151' }}>{result.certificate_id}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Issuing Body</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{result.issued_by}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
