import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ─── Preset date range helpers ───
function startOfDay(d) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d) { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }

function getPresetRange(key) {
  const now = new Date();
  const today = startOfDay(now);
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Mon=1

  switch (key) {
    case 'today': {
      return { after: today, before: endOfDay(now), label: 'Oggi' };
    }
    case 'this_week': {
      const mon = new Date(today);
      mon.setDate(mon.getDate() - (dayOfWeek - 1));
      return { after: mon, before: endOfDay(now), label: 'Questa settimana' };
    }
    case 'last_week': {
      const mon = new Date(today);
      mon.setDate(mon.getDate() - (dayOfWeek - 1) - 7);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      return { after: mon, before: endOfDay(sun), label: 'Settimana scorsa' };
    }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { after: first, before: endOfDay(now), label: 'Questo mese' };
    }
    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { after: first, before: endOfDay(last), label: 'Mese scorso' };
    }
    case 'this_year': {
      const jan1 = new Date(now.getFullYear(), 0, 1);
      return { after: jan1, before: endOfDay(now), label: "Quest'anno" };
    }
    default:
      return null;
  }
}

const PRESETS = [
  { key: 'today', label: 'Oggi' },
  { key: 'this_week', label: 'Questa settimana' },
  { key: 'last_week', label: 'Settimana scorsa' },
  { key: 'this_month', label: 'Questo mese' },
  { key: 'last_month', label: 'Mese scorso' },
  { key: 'this_year', label: "Quest'anno" },
];

const DAYS_SHORT = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];
const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

// ─── Mini Calendar Component ───
function MiniCalendar({ viewMonth, viewYear, selectedStart, selectedEnd, hoverDate, onDayClick, onDayHover, onPrev, onNext }) {
  const firstDay = new Date(viewYear, viewMonth, 1);
  let startWeekday = firstDay.getDay() - 1; // Mon=0
  if (startWeekday < 0) startWeekday = 6;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isInRange = (day) => {
    if (!day || !selectedStart) return false;
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    const s = new Date(selectedStart); s.setHours(0, 0, 0, 0);
    const e = selectedEnd ? new Date(selectedEnd) : (hoverDate ? new Date(hoverDate) : null);
    if (e) { e.setHours(0, 0, 0, 0); }
    if (!e) return date.getTime() === s.getTime();
    const min = s < e ? s : e;
    const max = s < e ? e : s;
    return date >= min && date <= max;
  };

  const isStart = (day) => {
    if (!day || !selectedStart) return false;
    const date = new Date(viewYear, viewMonth, day); date.setHours(0, 0, 0, 0);
    const s = new Date(selectedStart); s.setHours(0, 0, 0, 0);
    return date.getTime() === s.getTime();
  };

  const isEnd = (day) => {
    if (!day || !selectedEnd) return false;
    const date = new Date(viewYear, viewMonth, day); date.setHours(0, 0, 0, 0);
    const e = new Date(selectedEnd); e.setHours(0, 0, 0, 0);
    return date.getTime() === e.getTime();
  };

  const isToday = (day) => {
    if (!day) return false;
    const now = new Date();
    return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  };

  const isFuture = (day) => {
    if (!day) return false;
    const date = new Date(viewYear, viewMonth, day);
    return date > endOfDay(new Date());
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={onPrev} style={navBtnStyle}><ChevronLeft size={14} /></button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
          {MONTHS_IT[viewMonth]} {viewYear}
        </span>
        <button onClick={onNext} style={navBtnStyle}><ChevronRight size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAYS_SHORT.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', padding: '4px 0', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          const inRange = isInRange(day);
          const start = isStart(day);
          const end = isEnd(day);
          const today = isToday(day);
          const future = isFuture(day);
          return (
            <div
              key={i}
              onClick={() => day && !future && onDayClick(new Date(viewYear, viewMonth, day))}
              onMouseEnter={() => day && !future && onDayHover(new Date(viewYear, viewMonth, day))}
              style={{
                textAlign: 'center',
                fontSize: 12,
                padding: '6px 0',
                borderRadius: (start || end) ? 'var(--radius-sm)' : inRange ? 0 : 'var(--radius-sm)',
                background: (start || end) ? 'var(--accent)' : inRange ? 'var(--accent-glow)' : 'transparent',
                color: future ? 'var(--text-dim)' : (start || end) ? '#fff' : inRange ? 'var(--accent-light)' : today ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: (start || end || today) ? 700 : 400,
                cursor: day && !future ? 'pointer' : 'default',
                transition: 'all 0.1s',
                fontFamily: 'var(--font-display)',
                ...(day && !future && !inRange && !start && !end ? { ':hover': { background: 'var(--surface-hover)' } } : {}),
              }}
              onMouseOver={(e) => {
                if (day && !future && !inRange && !start && !end) e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onMouseOut={(e) => {
                if (!inRange && !start && !end) e.currentTarget.style.background = 'transparent';
              }}
            >
              {day || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle = {
  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-muted)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ─── Main DateFilter ───
export default function DateFilter({ onChange }) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [picking, setPicking] = useState(false); // true = picking end date
  const [hoverDate, setHoverDate] = useState(null);
  const [showCustom, setShowCustom] = useState(false);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyPreset = (key) => {
    const range = getPresetRange(key);
    if (!range) return;
    setActivePreset(key);
    setCustomStart(null);
    setCustomEnd(null);
    setShowCustom(false);
    setPicking(false);
    setOpen(false);
    onChange({
      callStartAfterUnix: Math.floor(range.after.getTime() / 1000),
      callStartBeforeUnix: Math.floor(range.before.getTime() / 1000),
      label: range.label,
    });
  };

  const handleDayClick = (date) => {
    if (!picking) {
      // first click = start
      setCustomStart(date);
      setCustomEnd(null);
      setPicking(true);
      setActivePreset(null);
    } else {
      // second click = end (or same day)
      let s = customStart;
      let e = date;
      if (e < s) { [s, e] = [e, s]; }
      setCustomStart(s);
      setCustomEnd(e);
      setPicking(false);
      setOpen(false);
      const isSameDay = startOfDay(s).getTime() === startOfDay(e).getTime();
      const label = isSameDay
        ? s.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
        : `${s.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} — ${e.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      onChange({
        callStartAfterUnix: Math.floor(startOfDay(s).getTime() / 1000),
        callStartBeforeUnix: Math.floor(endOfDay(e).getTime() / 1000),
        label,
      });
    }
  };

  const clear = (e) => {
    e.stopPropagation();
    setActivePreset(null);
    setCustomStart(null);
    setCustomEnd(null);
    setPicking(false);
    setShowCustom(false);
    setOpen(false);
    onChange(null);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const displayLabel = useMemo(() => {
    if (activePreset) {
      const p = PRESETS.find((p) => p.key === activePreset);
      return p?.label || '';
    }
    if (customStart && customEnd) {
      const isSameDay = startOfDay(customStart).getTime() === startOfDay(customEnd).getTime();
      if (isSameDay) return customStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${customStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} — ${customEnd.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    if (customStart && picking) return 'Seleziona fine…';
    return null;
  }, [activePreset, customStart, customEnd, picking]);

  const hasFilter = activePreset || (customStart && customEnd);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 'var(--radius-md)',
          border: `1px solid ${hasFilter ? 'var(--accent)' : 'var(--border)'}`,
          background: hasFilter ? 'var(--accent-glow)' : 'var(--surface)',
          color: hasFilter ? 'var(--accent-light)' : 'var(--text-muted)',
          fontSize: 12, cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 500,
          transition: 'all 0.15s',
        }}
      >
        <Calendar size={13} />
        {displayLabel || 'Filtra per data'}
        {hasFilter ? (
          <span onClick={clear} style={{ display: 'flex', alignItems: 'center', marginLeft: 2, opacity: 0.7 }}>
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={12} style={{ opacity: 0.5 }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          zIndex: 100, overflow: 'hidden',
          animation: 'fadeInUp 0.2s ease both',
          minWidth: showCustom ? 320 : 200,
        }}>
          {/* Presets */}
          {!showCustom && (
            <div style={{ padding: '8px 6px' }}>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: activePreset === p.key ? 'var(--accent-glow)' : 'transparent',
                    color: activePreset === p.key ? 'var(--accent-light)' : 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontWeight: activePreset === p.key ? 600 : 400,
                    transition: 'all 0.1s',
                  }}
                  onMouseOver={(e) => { if (activePreset !== p.key) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseOut={(e) => { if (activePreset !== p.key) e.currentTarget.style.background = 'transparent'; }}
                >
                  {p.label}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 12px' }} />
              <button
                onClick={() => {
                  setShowCustom(true);
                  setActivePreset(null);
                  setPicking(false);
                  setCustomStart(null);
                  setCustomEnd(null);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  border: 'none', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Calendar size={13} /> Data personalizzata…
              </button>
            </div>
          )}

          {/* Custom calendar */}
          {showCustom && (
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {picking ? 'Seleziona data fine' : 'Seleziona data inizio'}
                </span>
                <button
                  onClick={() => { setShowCustom(false); setPicking(false); setCustomStart(null); setCustomEnd(null); }}
                  style={{ ...navBtnStyle, width: 24, height: 24 }}
                >
                  <X size={12} />
                </button>
              </div>
              <MiniCalendar
                viewMonth={viewMonth}
                viewYear={viewYear}
                selectedStart={customStart}
                selectedEnd={customEnd}
                hoverDate={picking ? hoverDate : null}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
                onPrev={prevMonth}
                onNext={nextMonth}
              />
              {picking && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                  Clicca sullo stesso giorno per un singolo giorno, oppure su un altro giorno per un intervallo
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
