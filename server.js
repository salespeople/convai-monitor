import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const XI_API_KEY = process.env.XI_API_KEY || 'sk_deea5a325fc7cd64465d8de354edafd8c7d226cc3e9877cf_residency_eu';
const XI_API_BASE = 'https://api.eu.residency.elevenlabs.io/v1/convai';

// ─── Proxy for conversation audio ───
app.get('/api/audio/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  try {
    const response = await fetch(`${XI_API_BASE}/conversations/${conversationId}/audio`, {
      headers: { 'xi-api-key': XI_API_KEY },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Audio API error ${response.status}:`, text);
      return res.status(response.status).send(text);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Detect format from magic bytes
    let contentType = response.headers.get('content-type') || 'application/octet-stream';

    if (buffer.length >= 4) {
      const head = buffer.toString('ascii', 0, 4);
      if (head === 'RIFF') {
        contentType = 'audio/wav';
      } else if (head === 'OggS') {
        contentType = 'audio/ogg';
      } else if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) {
        contentType = 'audio/mpeg';
      } else if (head === 'fLaC') {
        contentType = 'audio/flac';
      } else if (buffer.toString('ascii', 4, 8) === 'ftyp') {
        contentType = 'audio/mp4';
      } else if (head === 'ID3\x03' || head === 'ID3\x04' || head.startsWith('ID3')) {
        contentType = 'audio/mpeg';
      }
    }

    // If it's still octet-stream, try wrapping raw PCM as WAV
    if (contentType === 'application/octet-stream' || contentType === 'audio/basic') {
      // Assume 16-bit PCM, 16kHz mono (common for ElevenLabs convai)
      const sampleRate = 16000;
      const bitsPerSample = 16;
      const numChannels = 1;
      const byteRate = sampleRate * numChannels * bitsPerSample / 8;
      const blockAlign = numChannels * bitsPerSample / 8;
      const dataSize = buffer.length;
      const wavHeaderSize = 44;
      const wavBuffer = Buffer.alloc(wavHeaderSize + dataSize);

      // RIFF header
      wavBuffer.write('RIFF', 0);
      wavBuffer.writeUInt32LE(36 + dataSize, 4);
      wavBuffer.write('WAVE', 8);
      // fmt chunk
      wavBuffer.write('fmt ', 12);
      wavBuffer.writeUInt32LE(16, 16);       // chunk size
      wavBuffer.writeUInt16LE(1, 20);        // PCM format
      wavBuffer.writeUInt16LE(numChannels, 22);
      wavBuffer.writeUInt32LE(sampleRate, 24);
      wavBuffer.writeUInt32LE(byteRate, 28);
      wavBuffer.writeUInt16LE(blockAlign, 32);
      wavBuffer.writeUInt16LE(bitsPerSample, 34);
      // data chunk
      wavBuffer.write('data', 36);
      wavBuffer.writeUInt32LE(dataSize, 40);
      buffer.copy(wavBuffer, wavHeaderSize);

      console.log(`Audio proxy: wrapped raw PCM as WAV (${dataSize} bytes data, ${sampleRate}Hz)`);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', wavBuffer.length);
      res.setHeader('Accept-Ranges', 'bytes');
      return res.send(wavBuffer);
    }

    console.log(`Audio proxy: serving ${contentType} (${buffer.length} bytes)`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(buffer);
  } catch (e) {
    console.error('Audio proxy error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Proxy for OpenAI classification ───
app.post('/api/classify', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY non configurata. Impostala nel file .env nella root del progetto.',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_tokens: 300,
        temperature: 0.2,
        messages: req.body.messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `OpenAI API Error: ${text}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('  🔮 ConvAI Monitor — Proxy server');
  console.log('  ─────────────────────────────────');
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  OpenAI key: ${OPENAI_API_KEY ? '✓ configured' : '✗ MISSING — add OPENAI_API_KEY to .env'}`);
  console.log('');
});
