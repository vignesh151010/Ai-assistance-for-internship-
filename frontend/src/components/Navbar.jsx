import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield } from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout } = useAuth();

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case 'ADMIN': return 'badge-danger';
      case 'MENTOR': return 'badge-primary';
      case 'INTERN': return 'badge-success';
      default: return 'badge-info';
    }
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
          AI-Powered Internship Management System
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#4338ca', fontWeight: 'bold'
          }}>
            {user?.full_name ? user.full_name[0] : 'U'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              {user?.full_name || 'Guest User'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`badge ${getRoleBadgeClass(role)}`} style={{ padding: '2px 8px', fontSize: '10px' }}>
                <Shield size={10} />
                {role || 'GUEST'}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{user?.email}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign Out"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
