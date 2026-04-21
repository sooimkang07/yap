const { ensureLocalEnv } = require('./_env');

ensureLocalEnv();

const DEFAULT_REPLY_MODEL = process.env.OPENAI_REPLY_MODEL || 'gpt-4o-mini';
const DEFAULT_ELEVEN_MODEL = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2';
const DEFAULT_OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const CHLOE_VOICE_ID = process.env.ELEVENLABS_CHLOE_VOICE_ID || '';
const MARIA_VOICE_ID = process.env.ELEVENLABS_MARIA_VOICE_ID || '';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendRouteError(res, 405, 'Method not allowed');
  }

  if (!process.env.OPENAI_API_KEY) {
    return sendRouteError(
      res,
      500,
      'OPENAI_API_KEY is not configured',
      'Restart `npx vercel dev` after updating `.env.local` so the local Vercel runtime reloads env vars.'
    );
  }

  try {
    const body = await readJson(req);
    const replies = await generateReplies(body);
    return res.status(200).json({ replies });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return sendRouteError(res, 500, message);
  }
};

function sendRouteError(res, status, error, hint = null) {
  return res.status(status).json({
    route: '/api/generate-replies',
    error,
    hint,
  });
}

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

async function generateReplies({ chatName, thread, latestUserMessage }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_REPLY_MODEL,
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You write realistic voice-memo replies in a close-friends group chat called "${chatName}".
Return JSON in the shape {"replies":[{"author_name":"Chloe","text":"..."},{"author_name":"Maria","text":"..."}]}.

Persona rules:
- Chloe: bubbly, validating, playful, reacts quickly, sounds spontaneous.
- Maria: grounded, observant, warm, slightly teasing, a little more practical.

Reply rules:
- return 1 or 2 replies total, never more than one reply per person
- do not force both Chloe and Maria to respond every time
- if only one person has the most natural reaction, return just that one reply
- prefer one reply when the topic is small or only one friend would realistically have something specific to say
- 1-2 spoken sentences each
- make them feel like actual voice replies, not polished essays
- every returned reply should clearly respond to the topic context
- keep the two voices distinct from each other
- each reply must anchor itself to at least one concrete detail from the memo topic or thread context
- avoid filler that could apply to any memo, like generic agreement without specifics
- if the user shared a story or plan, react to that exact story or plan rather than restating the topic label
- if context is ambiguous, ask a specific follow-up tied to the memo instead of using a vague acknowledgment
- no emojis
- no speaker labels inside the text`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            thread,
            latestUserMessage,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Reply text generation failed (${response.status}): ${await response.text()}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  const textReplies = Array.isArray(parsed?.replies) ? parsed.replies : [];

  const voices = {
    Chloe: {
      voiceId: CHLOE_VOICE_ID,
      fallbackVoice: 'nova',
      settings: {
        stability: 0.38,
        similarity_boost: 0.78,
        style: 0.34,
        use_speaker_boost: true,
      },
    },
    Maria: {
      voiceId: MARIA_VOICE_ID,
      fallbackVoice: 'shimmer',
      settings: {
        stability: 0.54,
        similarity_boost: 0.8,
        style: 0.16,
        use_speaker_boost: true,
      },
    },
  };

  const audioReplies = [];

  for (const reply of textReplies) {
    if (!reply?.text || !reply?.author_name) continue;

    const voiceConfig = voices[reply.author_name] || voices.Maria;
    const audio = await synthesizeReply(reply.text, voiceConfig);
    audioReplies.push({
      author_name: reply.author_name,
      text: reply.text.trim(),
      mime_type: 'audio/mpeg',
      audio_base64: audio,
      duration_ms: null,
    });
  }

  return audioReplies;
}

async function synthesizeReply(text, voiceConfig) {
  const voiceId = voiceConfig?.voiceId || '';
  const fallbackVoice = voiceConfig?.fallbackVoice || 'shimmer';

  if (!process.env.ELEVENLABS_API_KEY || !voiceId) {
    return synthesizeReplyWithOpenAI(text, fallbackVoice);
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: DEFAULT_ELEVEN_MODEL,
      voice_settings: voiceConfig?.settings || undefined,
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
