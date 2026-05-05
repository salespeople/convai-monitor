import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw } from 'lucide-react';
import { fetchAgents } from '../lib/api';
import { formatDate } from '../lib/utils';
import { LoadingPulse, EmptyState } from '../components/ui';

const TH_STYLE = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-dim)',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-elevated)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
  whiteSpace: 'nowrap',
};

export default function AgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAgents();
      setAgents(data.agents || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1060, margin: '0 auto', width: '100%' }}>
      {/* ─── Title ─── */}
      <div style={{ marginBottom: 24, animation: 'fadeInUp 0.4s ease' }}>
        <h2
          className="mono"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}
        >
          Seleziona un Agente
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Scegli l'agente di cui vuoi monitorare le conversazioni
        </p>
      </div>

      {/* ─── Controls ─── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 18,
          flexWrap: 'wrap',
          animation: 'fadeInUp 0.4s ease 0.05s both',
        }}
      >
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Cerca agente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={14} />
          Aggiorna
        </button>
      </div>

      {/* ─── Count ─── */}
      {!loading && !error && (
        <div
          className="mono"
          style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, letterSpacing: '0.04em' }}
        >
          {filtered.length} agent{filtered.length !== 1 ? 'i' : 'e'} trovat{filtered.length !== 1 ? 'i' : 'o'}
        </div>
      )}

      {/* ─── Error ─── */}
      {error && (
        <div
          style={{
            padding: '16px 20px', borderRadius: 'var(--radius-lg)',
            background: 'var(--danger-dim)', border: '1px solid rgba(255,107,107,0.2)',
            color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-display)',
            marginBottom: 20, lineHeight: 1.6,
          }}
        >
          <strong style={{ display: 'block', marginBottom: 4 }}>Errore di connessione</strong>
          {error}
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && <LoadingPulse rows={6} />}

      {/* ─── Agent Table ─── */}
      {!loading && !error && filtered.length > 0 && (
        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            animation: 'fadeInUp 0.35s ease both',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
            }}
          >
            <thead>
              <tr>
                <th style={TH_STYLE}>Nome</th>
                <th style={TH_STYLE}>Agent ID</th>
                <th style={TH_STYLE}>Creato il</th>
                <th style={TH_STYLE}>Creatore</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent, i) => {
                const isH = hovered === agent.agent_id;
                return (
                  <tr
                    key={agent.agent_id}
                    onClick={() => navigate(`/agent/${agent.agent_id}`, { state: { agent } })}
                    onMouseEnter={() => setHovered(agent.agent_id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      cursor: 'pointer',
                      background: isH ? 'var(--surface-hover)' : 'var(--surface)',
                      transition: 'background 0.15s',
                      animation: `fadeInUp 0.3s ease both`,
                      animationDelay: `${i * 0.03}s`,
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border)',
                        fontWeight: 600,
                        color: isH ? 'var(--accent-light)' : 'var(--text)',
                        transition: 'color 0.15s',
                      }}
                    >
                      {agent.name}
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        fontSize: 12,
                      }}
                    >
                      {agent.agent_id}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(agent.created_at_unix_secs)}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {agent.access_info?.creator_name || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="⌘"
          title="Nessun agente trovato"
          subtitle={search ? 'Prova a modificare i criteri di ricerca' : 'Non ci sono agenti disponibili'}
        />
      )}
    </div>
  );
}
