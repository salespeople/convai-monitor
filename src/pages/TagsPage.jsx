import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Tag, RefreshCw } from 'lucide-react';
import { fetchTags, createTag, deleteTag } from '../lib/api';
import { LoadingPulse, EmptyState, Spinner } from '../components/ui';
import { formatDate } from '../lib/utils';

const TH_STYLE = {
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-dim)',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-elevated)',
  whiteSpace: 'nowrap',
};

export default function TagsPage() {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New tag form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Delete state
  const [deleting, setDeleting] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTags();
      setTags(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createTag(newTitle.trim(), newDesc.trim() || undefined);
      // Reload to get fresh list
      await load();
      setNewTitle('');
      setNewDesc('');
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tagId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo tag?')) return;
    setDeleting((prev) => ({ ...prev, [tagId]: true }));
    try {
      await deleteTag(tagId);
      setTags((prev) => prev.filter((t) => t.tag_id !== tagId));
    } catch (e) {
      alert(`Errore: ${e.message}`);
    } finally {
      setDeleting((prev) => ({ ...prev, [tagId]: false }));
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, animation: 'fadeInUp 0.4s ease' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
            Gestione Tag
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Crea i tag che l'AI userà per classificare le conversazioni
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <RefreshCw size={12} /> Aggiorna
        </button>
      </div>

      {/* Create form */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          marginBottom: 24,
          animation: 'fadeInUp 0.4s ease 0.05s both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Plus size={16} color="var(--accent)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Nuovo Tag</span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Nome del tag (es. Trasferimento operatore)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={120}
            style={{
              flex: 2, minWidth: 200,
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
              outline: 'none', transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
          <input
            type="text"
            placeholder="Descrizione (opzionale — aiuta l'AI a capire quando usarlo)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            maxLength={1000}
            style={{
              flex: 3, minWidth: 250,
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
              outline: 'none', transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newTitle.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 'var(--radius-md)',
              border: 'none',
              background: newTitle.trim() ? 'linear-gradient(135deg, var(--accent), var(--accent-light))' : 'var(--surface-active)',
              color: newTitle.trim() ? '#fff' : 'var(--text-dim)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: newTitle.trim() && !creating ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? <Spinner size={14} color="#fff" /> : <Plus size={14} />}
            Crea
          </button>
        </div>

        {createError && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)' }}>
            {createError}
          </div>
        )}
      </div>

      {/* Info box */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent-glow)',
          border: '1px solid rgba(108,92,231,0.2)',
          marginBottom: 20,
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          animation: 'fadeInUp 0.4s ease 0.1s both',
        }}
      >
        <strong style={{ color: 'var(--accent-light)' }}>Come funziona:</strong> Quando classifichi una conversazione, l'AI analizzerà la trascrizione e sceglierà il tag più adatto tra quelli che hai creato qui. Più la descrizione è dettagliata, più la classificazione sarà precisa.
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--radius-lg)',
          background: 'var(--danger-dim)', border: '1px solid rgba(255,107,107,0.2)',
          color: 'var(--danger)', fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingPulse rows={4} />}

      {/* Tags count */}
      {!loading && !error && (
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, letterSpacing: '0.04em' }}>
          {tags.length} tag creat{tags.length !== 1 ? 'i' : 'o'}
        </div>
      )}

      {/* Tags table */}
      {!loading && !error && tags.length > 0 && (
        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            animation: 'fadeInUp 0.35s ease both',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr>
                <th style={TH_STYLE}>Nome</th>
                <th style={TH_STYLE}>Descrizione</th>
                <th style={TH_STYLE}>Creato il</th>
                <th style={{ ...TH_STYLE, width: 50, textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag, i) => (
                <tr
                  key={tag.tag_id}
                  style={{
                    background: 'var(--surface)',
                    animation: `fadeInUp 0.3s ease both`,
                    animationDelay: `${i * 0.03}s`,
                  }}
                >
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Tag size={13} color="var(--accent)" />
                      {tag.title}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, maxWidth: 300 }}>
                    {tag.description || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Nessuna descrizione</span>}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {formatDate(tag.created_at_unix_secs)}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(tag.tag_id)}
                      disabled={deleting[tag.tag_id]}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--danger)';
                        e.currentTarget.style.color = 'var(--danger)';
                        e.currentTarget.style.background = 'var(--danger-dim)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-dim)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {deleting[tag.tag_id] ? <Spinner size={12} color="var(--danger)" /> : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tags.length === 0 && (
        <EmptyState
          icon="🏷️"
          title="Nessun tag creato"
          subtitle="Crea il tuo primo tag usando il form qui sopra"
        />
      )}
    </div>
  );
}
