export function formatDate(unixSecs) {
  if (!unixSecs) return '—';
  return new Date(unixSecs * 1000).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(unixSecs) {
  if (!unixSecs) return '—';
  const d = new Date(unixSecs * 1000);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(secs) {
  if (!secs && secs !== 0) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function formatDurationLong(secs) {
  if (!secs && secs !== 0) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m === 0) return `${s} secondi`;
  if (s === 0) return `${m} minuti`;
  return `${m} min ${s} sec`;
}

export function statusLabel(status) {
  const map = {
    done: 'Completata',
    processing: 'In elaborazione',
    'in-progress': 'In corso',
    initiated: 'Avviata',
    failed: 'Fallita',
  };
  return map[status] || status || '—';
}

export function statusColor(status) {
  const map = {
    done: 'var(--success)',
    processing: 'var(--warning)',
    'in-progress': 'var(--info)',
    initiated: 'var(--text-muted)',
    failed: 'var(--danger)',
  };
  return map[status] || 'var(--text-muted)';
}

export function callResultLabel(result) {
  const map = {
    success: 'Successo',
    failure: 'Fallita',
    unknown: 'Sconosciuto',
  };
  return map[result] || result || '—';
}

export function callResultColor(result) {
  const map = {
    success: 'var(--success)',
    failure: 'var(--danger)',
    unknown: 'var(--text-muted)',
  };
  return map[result] || 'var(--text-muted)';
}
