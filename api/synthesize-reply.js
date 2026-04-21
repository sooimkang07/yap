const { ensureLocalEnv } = require('./_env');

ensureLocalEnv();

const DEFAULT_ELEVEN_MODEL = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2';
const DEFAULT_OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const CHLOE_VOICE_ID = process.env.ELEVENLABS_CHLOE_VOICE_ID || '';
const MARIA_VOICE_ID = process.env.ELEVENLABS_MARIA_VOICE_ID || '';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ route: '/api/synthesize-reply', error: 'Method not allowed' });
  }

  if (!process.env.ELEVENLABS_API_KEY && !process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      route: '/api/synthesize-reply',
      error: 'No TTS provider is configured',
    });
  }

  try {
    const body = await readJson(req);
    const audio = await synthesizeReply(
      body?.text || '',
      pickVoice(body?.authorName)
    );

    return res.status(200).json({
      mime_type: 'audio/mpeg',
      audio_base64: audio,
      duration_ms: estimateDurationMs(body?.text || ''),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return res.status(500).json({ route: '/api/synthesize-reply', error: message });
  }
};

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && !(req.body instanceof Uint8Array) && !Array.isArray(req.body)) {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function synthesizeReply(text, voice, instructions) {
  const voiceSettings = voice === CHLOE_VOICE_ID
    ? {
        stability: 0.38,
        similarity_boost: 0.78,
        style: 0.34,
        use_speaker_boost: true,
      }
    : {
        stability: 0.54,
        similarity_boost: 0.8,
        style: 0.16,
        use_speaker_boost: true,
      };

  if (!process.env.ELEVENLABS_API_KEY || !voice) {
    return synthesizeReplyWithOpenAI(text, voice === CHLOE_VOICE_ID ? 'nova' : 'shimmer');
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: DEFAULT_ELEVEN_MODEL,
      voice_settings: voiceSettings,
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

async function synthesizeReplyWithOpenAI(text, voice) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_TTS_MODEL,
      voice,
      format: 'mp3',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS failed (${response.status}): ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

function pickVoice(authorName) {
  return authorName === 'Chloe' ? CHLOE_VOICE_ID : MARIA_VOICE_ID;
}

function estimateDurationMs(text) {
  return Math.max(2600, String(text || '').trim().split(/\s+/).filter(Boolean).length * 220);
}
