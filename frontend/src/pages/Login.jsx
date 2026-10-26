import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, Key, UserCheck, Award } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'MENTOR') navigate('/mentor');
      else navigate('/intern');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const setDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '54px', height: '54px', margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
            borderRadius: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#ffffff', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)'
          }}>
            <ShieldCheck size={30} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            Internship Management System
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            AI-Powered Mentorship & Credential Platform
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', padding: '10px 14px', borderRadius: '8px',
            fontSize: '13px', marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@techcorp.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter secure password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '6px' }}
          >
            {submitting ? 'Authenticating...' : (
              <>
                <LogIn size={16} />
                <span>Sign In to Portal</span>
              </>
            )}
          </button>
        </form>

        {/* 1-Click Fast Demo Selector */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', textAlign: 'center' }}>
            Quick 1-Click Evaluation Accounts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setDemoAccount('admin@techcorp.com', 'Admin@2026Secure!')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '8px 4px', flexDirection: 'column', gap: '2px' }}
            >
              <span style={{ fontWeight: 'bold', color: '#dc2626' }}>ADMIN</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Dr. Vance</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('mentor@techcorp.com', 'Mentor@2026Secure!')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '8px 4px', flexDirection: 'column', gap: '2px' }}
            >
              <span style={{ fontWeight: 'bold', color: '#2563eb' }}>MENTOR</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Marcus</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('intern@techcorp.com', 'Intern@2026Secure!')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '8px 4px', flexDirection: 'column', gap: '2px' }}
            >
              <span style={{ fontWeight: 'bold', color: '#059669' }}>INTERN</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Aarav</span>
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link
            to="/verify-certificate"
            style={{ fontSize: '13px', color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}
          >
            <Award size={14} />
            <span>Public Certificate Verification Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
