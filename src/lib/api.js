// ─── ElevenLabs API Configuration ───
const API_BASE = 'https://api.eu.residency.elevenlabs.io/v1/convai';
const API_KEY = 'sk_deea5a325fc7cd64465d8de354edafd8c7d226cc3e9877cf_residency_eu';

const headers = {
  'xi-api-key': API_KEY,
  'Content-Type': 'application/json',
};

async function request(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API Error ${res.status}: ${body}`);
  }
  return res.json();
}

async function postRequest(endpoint, body = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  const text = await res.text();
  if (!text || text.trim() === '') return {};
  try { return JSON.parse(text); } catch { return {}; }
}

async function deleteRequest(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'xi-api-key': API_KEY },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  return {};
}

// ─── Agents ───

export async function fetchAgents({ pageSize = 100, search, archived = false } = {}) {
  return request('/agents', {
    page_size: pageSize,
    search: search || undefined,
    archived,
  });
}

// ─── Conversations ───

export async function fetchConversations({
  agentId,
  pageSize = 30,
  cursor,
  tagIds,
  callStartAfterUnix,
  callStartBeforeUnix,
} = {}) {
  const params = {
    agent_id: agentId,
    page_size: pageSize,
    cursor,
    summary_mode: 'include',
  };
  // tag_ids filter if needed
  if (tagIds && tagIds.length > 0) {
    params.tag_ids = tagIds.join(',');
  }
  // date range filter
  if (callStartAfterUnix != null) {
    params.call_start_after_unix = callStartAfterUnix;
  }
  if (callStartBeforeUnix != null) {
    params.call_start_before_unix = callStartBeforeUnix;
  }
  return request('/conversations', params);
}

export async function fetchConversationDetail(conversationId) {
  return request(`/conversations/${conversationId}`);
}

// ─── Audio ───

const PROXY_AUDIO_URL = '/api/audio';

export function getConversationAudioUrl(conversationId) {
  return `${PROXY_AUDIO_URL}/${conversationId}`;
}

// ─── Tags ───

export async function fetchTags() {
  const data = await request('/tags');
  if (data.conversation_tags && Array.isArray(data.conversation_tags)) return data.conversation_tags;
  if (Array.isArray(data)) return data;
  if (data.tags && Array.isArray(data.tags)) return data.tags;
  return [];
}

export async function createTag(title, description) {
  return postRequest('/tags', { title, description: description || undefined });
}

export async function deleteTag(tagId) {
  return deleteRequest(`/tags/${tagId}`);
}

export async function addTagToConversation(conversationId, tagIds) {
  return postRequest(`/conversations/${conversationId}/tags`, { tag_ids: tagIds });
}

export async function removeTagFromConversation(conversationId, tagId) {
  return deleteRequest(`/conversations/${conversationId}/tags/${tagId}`);
}

// ─── Classification via OpenAI (through local proxy) ───

const PROXY_URL = '';

/**
 * Classify a transcript and generate a concise summary.
 * Uses ONLY the provided workspace tags.
 * @param {Array} transcript - Array of {role, message} objects
 * @param {Array} availableTags - Array of {tag_id, title, description} from workspace
 * @returns {Object} - { tag_id, confidence, reason, summary }
 */
export async function classifyTranscript(transcript, availableTags) {
  if (!availableTags || availableTags.length === 0) {
    throw new Error('Nessun tag disponibile. Crea almeno un tag nella sezione Tag prima di classificare.');
  }

  const transcriptText = transcript
    .map((m) => `[${m.role === 'user' ? 'UTENTE' : 'AGENTE'}]: ${m.message}`)
    .join('\n');

  const tagsList = availableTags
    .map((t) => `- tag_id: "${t.tag_id}" | titolo: "${t.title}"${t.description ? ` | descrizione: ${t.description}` : ''}`)
    .join('\n');

  const systemPrompt = `Sei un analista di conversazioni per un call center / assistente virtuale.
Devi fare DUE cose:

1. CLASSIFICAZIONE: Assegna UNO SOLO dei tag disponibili — quello più pertinente.
2. RIASSUNTO: Scrivi un riassunto breve e diretto della conversazione (1-2 frasi, massimo 150 caratteri).

REGOLE PER IL RIASSUNTO:
- Vai dritto al punto: cosa ha chiesto il cliente e cosa è successo.
- NON includere le frasi introduttive dell'agente (saluti, presentazioni, disclaimer sulla registrazione).
- NON iniziare con "Il cliente chiama per..." o simili. Inizia direttamente con l'azione.
- Esempi di buoni riassunti:
  "Chiede di parlare con un operatore. Trasferito."
  "Richiede info su tagliando Audi A3. Appuntamento fissato per lunedì."
  "Reclamo per ritardo consegna ricambi. Segnalazione aperta."

REGOLE PER IL TAG:
- Devi scegliere ESATTAMENTE UNO dei tag elencati sotto. Non puoi inventarne di nuovi.
- Se nessun tag sembra perfetto, scegli quello più vicino.

TAG DISPONIBILI:
${tagsList}

FORMATO RISPOSTA (solo JSON, niente altro):
{"tag_id": "...", "confidence": 0.0-1.0, "reason": "breve motivazione", "summary": "riassunto diretto"}`;

  const res = await fetch(`${PROXY_URL}/api/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analizza questa conversazione:\n\n${transcriptText}` },
      ],
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Proxy error' }));
    throw new Error(errData.error || `Proxy Error ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
