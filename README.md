# ConvAI Monitor

Dashboard per monitorare e classificare automaticamente le conversazioni degli agenti ElevenLabs.

## Requisiti

- Node.js 18+
- API key ElevenLabs (già configurata in `src/lib/api.js`)
- API key Anthropic (per la classificazione automatica via Claude)

## Installazione

```bash
cd convai-monitor
npm install
```

## Avvio

Servono **due processi**: il frontend Vite e il proxy server per le chiamate a Claude.

### Opzione 1: avvio unico (consigliato)

```bash
ANTHROPIC_API_KEY=sk-ant-la-tua-chiave npm run dev
```

Questo avvia sia il frontend (porta 3000) che il proxy server (porta 3001) insieme.

### Opzione 2: avvio separato

```bash
# Terminale 1 — Frontend
npm run dev:client

# Terminale 2 — Proxy server
ANTHROPIC_API_KEY=sk-ant-la-tua-chiave npm run dev:server
```

## Funzionalità

- **Lista agenti** — Tabella con nome, ID, data creazione e creatore
- **Lista conversazioni** — Per ogni agente: ID, inizio, durata, tag e summary
- **Dettaglio conversazione** — Pannello laterale con trascrizione, audio e dati raccolti
- **Auto-Tag con AI** — Classificazione automatica delle conversazioni tramite Claude:
  - Click su ⚡ per classificare una singola conversazione
  - Click su "Auto-Tag" per classificare tutte le conversazioni in batch
  - I tag vengono creati automaticamente nel workspace ElevenLabs
  - I tag vengono assegnati alle conversazioni via API

## Categorie di classificazione

| Categoria | Descrizione |
|-----------|-------------|
| Trasferimento operatore | L'utente chiede di parlare con un operatore umano |
| Richiesta informazioni | L'utente chiede info su prodotti, servizi, orari, prezzi |
| Assistenza tecnica | L'utente ha un problema tecnico |
| Reclamo | L'utente esprime insoddisfazione |
| Prenotazione / Appuntamento | L'utente vuole prenotare o fissare un appuntamento |
| Feedback positivo | L'utente esprime soddisfazione |
| Conversazione incompleta | Conversazione interrotta o intento non chiaro |
| Altro | Nessuna delle categorie precedenti |

Le categorie sono configurabili in `src/lib/api.js` nell'array `CLASSIFICATION_CATEGORIES`.

## Architettura

```
Browser (Vite, porta 3000)
  ├── ElevenLabs API (diretto) → agenti, conversazioni, tag
  └── Proxy server (porta 3001) → Claude API (classificazione)

server.js (Express, porta 3001)
  └── POST /api/classify → Anthropic API
```

Il proxy server è necessario perché l'API Anthropic non accetta chiamate dirette dal browser (CORS).

## Struttura progetto

```
convai-monitor/
├── index.html
├── package.json
├── vite.config.js
├── server.js                   # Proxy server per Claude API
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── components/
    │   ├── Layout.jsx
    │   └── ui.jsx
    ├── lib/
    │   ├── api.js              # API ElevenLabs + classificazione
    │   └── utils.js
    ├── pages/
    │   ├── AgentsPage.jsx
    │   └── AgentDetailPage.jsx
    └── styles/
        └── globals.css
```
