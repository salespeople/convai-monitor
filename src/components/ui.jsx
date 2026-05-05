import React from 'react';

/* ─── Badge ─── */
export function Badge({ children, color = 'var(--accent)', style }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ─── StatusDot ─── */
export function StatusDot({ color = 'var(--success)', size = 7, pulse }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        flexShrink: 0,
        animation: pulse ? 'pulseGlow 2s ease-in-out infinite' : undefined,
      }}
    />
  );
}

/* ─── Loading Skeleton ─── */
export function LoadingPulse({ rows = 4, height = 56 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            borderRadius: 'var(--radius-md)',
            background: `linear-gradient(90deg, var(--surface) 0%, var(--surface-hover) 50%, var(--surface) 100%)`,
            backgroundSize: '200% 100%',
            animation: `shimmer 1.5s ease-in-out infinite`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Spinner ─── */
export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" opacity="0.2" />
      <path
        d="M12 2a10 10 0 019.8 8"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Empty State ─── */
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 24px',
        color: 'var(--text-dim)',
        animation: 'fadeIn 0.4s ease',
      }}
    >
      {icon && (
        <div style={{ fontSize: 44, marginBottom: 16, opacity: 0.35 }}>{icon}</div>
      )}
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, marginBottom: 6, color: 'var(--text-muted)' }}>
        {title}
      </p>
      {subtitle && <p style={{ fontSize: 13 }}>{subtitle}</p>}
    </div>
  );
}

/* ─── InfoCard (key-value grid item) ─── */
export function InfoCard({ label, value, mono }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-hover)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text)',
          fontFamily: mono ? 'var(--font-display)' : 'var(--font-body)',
          wordBreak: 'break-all',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}
