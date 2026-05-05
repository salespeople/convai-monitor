import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Monitor, Tag } from 'lucide-react';
import { StatusDot } from './ui';

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ─── */}
      <header
        style={{
          padding: '0 28px',
          height: 60,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            onClick={() => navigate('/')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulseGlow 3s ease-in-out infinite',
              cursor: 'pointer',
            }}
          >
            <Monitor size={18} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <h1
              className="mono"
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              ConvAI Monitor
            </h1>
            <span
              className="mono"
              style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.04em' }}
            >
              ElevenLabs Agent Dashboard
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/tags')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-muted)',
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Tag size={13} />
            Gestione Tag
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
            }}
          >
            <StatusDot color="var(--success)" />
            API Connected
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
