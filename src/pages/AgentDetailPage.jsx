import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, ChevronDown, X,
  User, Bot, Headphones, Tag, Zap, Loader2,
} from 'lucide-react';
import DateFilter from '../components/DateFilter';
import {
  fetchConversations, fetchConversationDetail, getConversationAudioUrl,
  fetchTags, addTagToConversation, removeTagFromConversation, classifyTranscript,
} from '../lib/api';
import { formatDateTime, formatDuration, formatDurationLong, statusLabel } from '../lib/utils';
import { LoadingPulse, EmptyState, Spinner, InfoCard, Badge } from '../components/ui';

const TH_STYLE = {
  padding: '10px 14px', fontSize: 11, fontWeight: 600,
  fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'left',
  borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)',
  position: 'sticky', top: 0, zIndex: 2, whiteSpace: 'nowrap',
};

// Assign a stable color per tag_id using a palette
const TAG_PALETTE = [
  'var(--warning)', 'var(--info)', '#E879F9', 'var(--danger)',
  'var(--success)', '#34D399', '#F97316', '#818CF8)',
];
function tagColor(tagId, allTagIds) {
  const idx = allTagIds.indexOf(tagId);
  return TAG_PALETTE[idx % TAG_PALETTE.length];
}

// ─── Audio Player (blob-based) ───
function AudioPlayer({ conversationId }) {
  const audioRef = useRef(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);

  useEffect(() => {
    let revoke = null;
    setAudioLoading(true);
    setAudioError(null);
    setBlobUrl(null);

    fetch(getConversationAudioUrl(conversationId))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoke = url;
        setBlobUrl(url);
      })
      .catch((e) => {
        console.error('Audio load error:', e);
        setAudioError(e.message);
      })
      .finally(() => setAudioLoading(false));

    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [conversationId]);

  return (
    <div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Headphones size={12} /> Audio registrazione
      </div>
      {audioLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Caricamento audio…
        </div>
      )}
      {audioError && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--danger-dim)', border: '1px solid rgba(255,107,107,0.2)', color: 'var(--danger)', fontSize: 12 }}>
          Errore caricamento audio: {audioError}
        </div>
      )}
      {blobUrl && (
        <audio ref={audioRef} controls src={blobUrl} style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
      )}
    </div>
  );
}

export default function AgentDetailPage() {
  const { agentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const agent = location.state?.agent;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Detail panel
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Date filter
  const [dateFilter, setDateFilter] = useState(null); // { callStartAfterUnix, callStartBeforeUnix, label }
  const dateFilterRef = useRef(dateFilter);
  useEffect(() => { dateFilterRef.current = dateFilter; }, [dateFilter]);

  // Hover
  const [hovered, setHovered] = useState(null);

  // Tags
  const [workspaceTags, setWorkspaceTags] = useState([]); // array of tag objects
  const [workspaceTagsMap, setWorkspaceTagsMap] = useState({}); // tag_id -> tag obj
  const [convTagMap, setConvTagMap] = useState({}); // conversation_id -> [tag_ids]
  const [aiSummaryMap, setAiSummaryMap] = useState({}); // conversation_id -> summary string
  const [classifying, setClassifying] = useState({});
  const [classifyingAll, setClassifyingAll] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef(false);
  const [loadingTags, setLoadingTags] = useState(false);

  // ─── Load workspace tags ───
  const loadTags = useCallback(async () => {
    try {
      const tags = await fetchTags();
      setWorkspaceTags(tags);
      const map = {};
      tags.forEach((t) => { map[t.tag_id] = t; });
      setWorkspaceTagsMap(map);
      return tags;
    } catch (e) {
      console.warn('Could not load tags:', e);
      return [];
    }
  }, []);

  // ─── Load conversations ───
  const load = useCallback(async (reset = true) => {
    if (reset) { setLoading(true); setError(null); }
    else { setLoadingMore(true); }
    try {
      const df = dateFilterRef.current;
      const data = await fetchConversations({
        agentId, pageSize: 50,
        cursor: reset ? undefined : cursor,
        callStartAfterUnix: df?.callStartAfterUnix,
        callStartBeforeUnix: df?.callStartBeforeUnix,
      });
      const list = data.conversations || [];
      setConversations((prev) => reset ? list : [...prev, ...list]);
      setHasMore(data.has_more);
      setCursor(data.next_cursor);

      // For each conversation, fetch tag_ids from detail
      // Do this in parallel, batched
      if (reset) {
        loadConvTags(list);
      } else {
        loadConvTags(list);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [agentId, cursor]);

  // ─── Batch-load tag_ids for conversations ───
  const loadConvTags = async (convs) => {
    setLoadingTags(true);
    const batchSize = 5;
    for (let i = 0; i < convs.length; i += batchSize) {
      const batch = convs.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((c) => fetchConversationDetail(c.conversation_id))
      );
      const updates = {};
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value.tag_ids && r.value.tag_ids.length > 0) {
          updates[batch[idx].conversation_id] = r.value.tag_ids;
        }
      });
      if (Object.keys(updates).length > 0) {
        setConvTagMap((prev) => ({ ...prev, ...updates }));
      }
    }
    setLoadingTags(false);
  };

  useEffect(() => {
    load(true);
    loadTags();
  }, [agentId, dateFilter]); // eslint-disable-line

  // ─── Load conversation detail ───
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    fetchConversationDetail(selectedId)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          if (d.tag_ids && d.tag_ids.length > 0) {
            setConvTagMap((prev) => ({ ...prev, [selectedId]: d.tag_ids }));
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  // ─── Classify single conversation ───
  const classifySingle = async (conversationId) => {
    if (workspaceTags.length === 0) {
      alert('Devi prima creare almeno un tag nella sezione "Gestione Tag".');
      return;
    }
    setClassifying((prev) => ({ ...prev, [conversationId]: true }));
    try {
      const d = await fetchConversationDetail(conversationId);
      if (!d.transcript || d.transcript.length === 0) throw new Error('Nessuna trascrizione');

      const result = await classifyTranscript(d.transcript, workspaceTags);

      // Validate tag_id exists in workspace
      if (!workspaceTagsMap[result.tag_id]) {
        throw new Error(`Tag restituito dall'AI non trovato: ${result.tag_id}`);
      }

      await addTagToConversation(conversationId, [result.tag_id]);
      setConvTagMap((prev) => ({
        ...prev,
        [conversationId]: [...new Set([...(prev[conversationId] || []), result.tag_id])],
      }));
      if (result.summary) {
        setAiSummaryMap((prev) => ({ ...prev, [conversationId]: result.summary }));
      }
    } catch (e) {
      console.error(`Classification error for ${conversationId}:`, e);
      alert(`Errore classificazione: ${e.message}`);
    } finally {
      setClassifying((prev) => ({ ...prev, [conversationId]: false }));
    }
  };

  // ─── Classify all untagged ───
  const classifyAll = async () => {
    if (workspaceTags.length === 0) {
      alert('Devi prima creare almeno un tag nella sezione "Gestione Tag".');
      return;
    }
    abortRef.current = false;
    setClassifyingAll(true);

    const untagged = conversations.filter(
      (c) => !convTagMap[c.conversation_id] || convTagMap[c.conversation_id].length === 0
    );
    setClassifyProgress({ done: 0, total: untagged.length });

    let done = 0;
    for (const conv of untagged) {
      if (abortRef.current) break;
      try {
        const d = await fetchConversationDetail(conv.conversation_id);
        if (d.tag_ids && d.tag_ids.length > 0) {
          setConvTagMap((prev) => ({ ...prev, [conv.conversation_id]: d.tag_ids }));
          done++;
          setClassifyProgress({ done, total: untagged.length });
          continue;
        }
        if (!d.transcript || d.transcript.length === 0) {
          done++;
          setClassifyProgress({ done, total: untagged.length });
          continue;
        }

        const result = await classifyTranscript(d.transcript, workspaceTags);
        if (workspaceTagsMap[result.tag_id]) {
          await addTagToConversation(conv.conversation_id, [result.tag_id]);
          setConvTagMap((prev) => ({
            ...prev,
            [conv.conversation_id]: [result.tag_id],
          }));
        }
        if (result.summary) {
          setAiSummaryMap((prev) => ({ ...prev, [conv.conversation_id]: result.summary }));
        }
      } catch (e) {
        console.error(`Error classifying ${conv.conversation_id}:`, e);
      }
      done++;
      setClassifyProgress({ done, total: untagged.length });
      await new Promise((r) => setTimeout(r, 500));
    }
    setClassifyingAll(false);
  };

  // ─── Helpers ───
  const allTagIds = workspaceTags.map((t) => t.tag_id);

  const getConvTagObjects = (conversationId) => {
    const tagIds = convTagMap[conversationId] || [];
    return tagIds.map((id) => workspaceTagsMap[id]).filter(Boolean);
  };

  // ─── Remove tag from conversation ───
  const removeConvTag = async (conversationId, tagId, e) => {
    if (e) e.stopPropagation();
    try {
      await removeTagFromConversation(conversationId, tagId);
      setConvTagMap((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter((id) => id !== tagId),
      }));
    } catch (err) {
      console.error('Remove tag error:', err);
      alert(`Errore rimozione tag: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* ─── Left: Conversation Table ─── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: selectedId ? '1px solid var(--border)' : 'none' }}>
        {/* Sub-header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="mono" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{agent?.name || 'Agente'}</h2>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{agentId}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {conversations.length} conversazion{conversations.length !== 1 ? 'i' : 'e'}
              {loadingTags && <span style={{ marginLeft: 6, color: 'var(--accent)' }}>· caricamento tag…</span>}
            </span>
            <DateFilter onChange={(filter) => setDateFilter(filter)} />
            {!loading && conversations.length > 0 && (
              <button
                onClick={classifyingAll ? () => { abortRef.current = true; } : classifyAll}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${classifyingAll ? 'var(--warning)' : 'var(--accent)'}`,
                  background: classifyingAll ? 'var(--warning-dim)' : 'var(--accent-glow)',
                  color: classifyingAll ? 'var(--warning)' : 'var(--accent-light)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500,
                }}
              >
                {classifyingAll ? (
                  <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />{classifyProgress.done}/{classifyProgress.total} — Stop</>
                ) : (
                  <><Zap size={13} />Auto-Tag</>
                )}
              </button>
            )}
            <button onClick={() => load(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <RefreshCw size={12} /> Aggiorna
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {error && <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-lg)', background: 'var(--danger-dim)', border: '1px solid rgba(255,107,107,0.2)', color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-display)', marginBottom: 16 }}>{error}</div>}

          {loading && <LoadingPulse rows={8} height={48} />}

          {!loading && !error && conversations.length === 0 && <EmptyState icon="💬" title={dateFilter ? "Nessuna conversazione trovata" : "Nessuna conversazione"} subtitle={dateFilter ? `Nessun risultato per il periodo: ${dateFilter.label}` : "Questo agente non ha ancora conversazioni registrate"} />}

          {!loading && !error && conversations.length > 0 && (
            <>
              <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'fadeInUp 0.35s ease both' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-body)', minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th style={TH_STYLE}>Conversation ID</th>
                        <th style={TH_STYLE}>Inizio</th>
                        <th style={TH_STYLE}>Durata</th>
                        <th style={TH_STYLE}>Tag</th>
                        <th style={TH_STYLE}>AI Summary</th>
                        <th style={{ ...TH_STYLE, textAlign: 'center', width: 50 }}>AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.map((conv, i) => {
                        const isH = hovered === conv.conversation_id;
                        const isSelected = selectedId === conv.conversation_id;
                        const tags = getConvTagObjects(conv.conversation_id);
                        const isClassifying = classifying[conv.conversation_id];

                        return (
                          <tr
                            key={conv.conversation_id}
                            onClick={() => setSelectedId(isSelected ? null : conv.conversation_id)}
                            onMouseEnter={() => setHovered(conv.conversation_id)}
                            onMouseLeave={() => setHovered(null)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? 'var(--accent-glow)' : isH ? 'var(--surface-hover)' : 'var(--surface)',
                              transition: 'background 0.15s',
                              animation: `fadeInUp 0.3s ease both`,
                              animationDelay: `${Math.min(i, 20) * 0.02}s`,
                            }}
                          >
                            <td className="mono" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, color: isSelected ? 'var(--accent-light)' : 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {conv.conversation_id}
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>
                              {formatDateTime(conv.start_time_unix_secs)}
                            </td>
                            <td className="mono" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>
                              {formatDuration(conv.call_duration_secs)}
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                              {tags.length > 0 ? (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {tags.map((t) => (
                                    <span
                                      key={t.tag_id}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 8px 3px 10px', borderRadius: 100,
                                        fontSize: 11, fontWeight: 600,
                                        color: tagColor(t.tag_id, allTagIds),
                                        background: `color-mix(in srgb, ${tagColor(t.tag_id, allTagIds)} 14%, transparent)`,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {t.title}
                                      <span
                                        onClick={(e) => removeConvTag(conv.conversation_id, t.tag_id, e)}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                          width: 14, height: 14, borderRadius: '50%',
                                          cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.15s',
                                          marginLeft: 2,
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                                      >
                                        <X size={10} />
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {aiSummaryMap[conv.conversation_id] || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                            </td>
                            <td
                              style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isClassifying && tags.length === 0) classifySingle(conv.conversation_id);
                              }}
                            >
                              {isClassifying ? (
                                <Loader2 size={14} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                              ) : tags.length > 0 ? (
                                <Tag size={14} color="var(--success)" />
                              ) : (
                                <Zap size={14} color="var(--text-dim)" style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {hasMore && (
                <button onClick={() => load(false)} disabled={loadingMore}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', marginTop: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-body)', cursor: loadingMore ? 'wait' : 'pointer', width: '100%' }}
                >
                  {loadingMore ? <Spinner size={14} /> : <ChevronDown size={14} />}
                  {loadingMore ? 'Caricamento...' : 'Carica altre conversazioni'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Right: Detail Panel ─── */}
      {selectedId && (
        <div style={{ width: 480, minWidth: 380, display: 'flex', flexDirection: 'column', background: 'var(--bg)', animation: 'slideInRight 0.3s ease both', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 className="mono" style={{ fontSize: 14, fontWeight: 600 }}>Dettaglio Conversazione</h3>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{selectedId}</span>
            </div>
            <button onClick={() => setSelectedId(null)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
            {detailLoading && <LoadingPulse rows={4} height={48} />}
            {!detailLoading && detail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Tags */}
                {getConvTagObjects(selectedId).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {getConvTagObjects(selectedId).map((t) => (
                      <span
                        key={t.tag_id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px 4px 12px', borderRadius: 100,
                          fontSize: 12, fontWeight: 600,
                          color: tagColor(t.tag_id, allTagIds),
                          background: `color-mix(in srgb, ${tagColor(t.tag_id, allTagIds)} 14%, transparent)`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Tag size={11} />{t.title}
                        <span
                          onClick={() => removeConvTag(selectedId, t.tag_id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 16, height: 16, borderRadius: '50%',
                            cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.15s',
                            marginLeft: 2,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                        >
                          <X size={11} />
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <InfoCard label="Stato" value={statusLabel(detail.status)} />
                  <InfoCard label="Esito" value={detail.analysis?.call_successful || '—'} />
                  <InfoCard label="Durata" value={formatDurationLong(detail.metadata?.call_duration_secs)} />
                  <InfoCard label="Inizio" value={formatDateTime(detail.metadata?.start_time_unix_secs)} />
                  {detail.analysis?.evaluation_criteria_results && (
                    <InfoCard label="Valutazione" value={Object.entries(detail.analysis.evaluation_criteria_results).map(([k, v]) => `${k}: ${v.result}`).join(', ') || '—'} />
                  )}
                  {detail.analysis?.transcript_summary && (
                    <div style={{ gridColumn: '1 / -1' }}><InfoCard label="Riepilogo" value={detail.analysis.transcript_summary} /></div>
                  )}
                </div>

                {/* Audio */}
                {detail.has_audio && (
                  <AudioPlayer conversationId={selectedId} />
                )}

                {/* Transcript */}
                {detail.transcript && detail.transcript.length > 0 && (
                  <div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Trascrizione ({detail.transcript.length} messaggi)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {detail.transcript.map((msg, i) => {
                        const isUser = msg.role === 'user';
                        return (
                          <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: isUser ? 'var(--surface)' : 'var(--accent-glow)', border: `1px solid ${isUser ? 'var(--border)' : 'rgba(108,92,231,0.15)'}`, animation: `fadeInUp 0.25s ease both`, animationDelay: `${i * 0.02}s` }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isUser ? 'var(--surface-active)' : 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isUser ? <User size={13} color="var(--text-muted)" /> : <Bot size={13} color="#fff" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: isUser ? 'var(--text-secondary)' : 'var(--accent-light)' }}>{isUser ? 'Utente' : 'Agente'}</span>
                                {msg.time_in_call_secs != null && <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>{formatDuration(msg.time_in_call_secs)}</span>}
                              </div>
                              <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text)', wordBreak: 'break-word' }}>{msg.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data collection */}
                {detail.analysis?.data_collection_results && Object.keys(detail.analysis.data_collection_results).length > 0 && (
                  <div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Dati raccolti</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                      {Object.entries(detail.analysis.data_collection_results).map(([key, val]) => (
                        <InfoCard key={key} label={key} value={val?.value || JSON.stringify(val)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
