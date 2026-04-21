const { ensureLocalEnv } = require('./_env');

ensureLocalEnv();

const DEFAULT_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe';
const DEFAULT_SEGMENT_MODEL = process.env.OPENAI_SEGMENT_MODEL || 'gpt-4o-mini';

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
    const durationMs = Number(req.headers['x-yap-duration-ms'] || 0);
    const threadContext = readThreadContext(req.headers['x-yap-thread-context']);
    const payload = await readAudioPayload(req);
    const contentType = payload.contentType || 'audio/webm';
    const body = payload.buffer;

    if (!body.length) {
      return sendRouteError(
        res,
        400,
        'Missing audio payload',
        `Request body was empty in /api/process-audio. content-type=${contentType || 'unknown'}`
      );
    }

    const transcript = await transcribeAudio(body, contentType);
    const segments = transcript
      ? await segmentTranscript(transcript, durationMs, threadContext)
      : [];

    const topics = segments.map((segment, index) => ({
      id: segment.assigned_thread_id || `topic-${index}`,
      label: segment.label,
      excerpt: segment.excerpt,
      transcript: segment.transcript,
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      assigned_thread_id: segment.assigned_thread_id || null,
    }));

    return res.status(200).json({
      transcript,
      words: null,
      segments,
      topics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return sendRouteError(res, 500, message);
  }
};

function sendRouteError(res, status, error, hint = null) {
  return res.status(status).json({
    route: '/api/process-audio',
    error,
    hint,
  });
}

async function readRequestBody(req) {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (req.body instanceof Uint8Array) return Buffer.from(req.body);
    if (typeof req.body === 'string') return Buffer.from(req.body);
    if (req.body instanceof ArrayBuffer) return Buffer.from(req.body);
    if (Array.isArray(req.body)) return Buffer.from(req.body);
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function readAudioPayload(req) {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    const json = await readJsonBody(req);
    const audioBase64 = typeof json.audioBase64 === 'string' ? json.audioBase64 : '';
    const mimeType = typeof json.mimeType === 'string' && json.mimeType ? json.mimeType : 'audio/webm';

    return {
      contentType: mimeType,
      buffer: audioBase64 ? Buffer.from(audioBase64, 'base64') : Buffer.alloc(0),
    };
  }

  return {
    contentType: contentType || 'audio/webm',
    buffer: await readRequestBody(req),
  };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && !(req.body instanceof Uint8Array) && !Array.isArray(req.body)) {
    return req.body;
  }

  const raw = await readRequestBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString('utf8') || '{}');
}

function readThreadContext(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];

  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

async function transcribeAudio(buffer, contentType) {
  const form = new FormData();
  const extension = contentType.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob([buffer], { type: contentType });

  form.append('file', blob, `recording.${extension}`);
  form.append('model', DEFAULT_TRANSCRIBE_MODEL);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed (${response.status}): ${await response.text()}`);
  }

  const json = await response.json();
  return (json.text || '').trim();
}

async function segmentTranscript(transcript, durationMs, threadContext) {
  const threadContextBlock = threadContext.length
    ? `Existing topic threads:
${JSON.stringify(threadContext, null, 2)}

Interpretation rules for the thread metadata:
- "unheardCount" means the user has friend replies in that thread they have not finished hearing yet
- "lastHeardAt" means the user most recently listened to that thread around that time
- when a semantic match is plausible, prioritize threads with recent heard context or unheard replies before older unrelated threads

For each segment, set "assigned_thread_id" to one of the existing ids only when it is clearly the same ongoing topic. Otherwise return null.`
    : 'There are no existing topic threads yet. Use null for every "assigned_thread_id".';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_SEGMENT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You segment voice memo transcripts into topic units for a chat app.
Return JSON: {"segments":[...]}.

Each segment must include:
- "label": 2-5 words, specific and natural
- "excerpt": a short phrase lifted from the actual segment, 6-16 words
- "transcript": the text for just that segment
- "start_ms": approximate start time
- "end_ms": approximate end time
- "assigned_thread_id": an existing thread id or null

Rules:
- detect genuine topic shifts from discourse and sentence structure
- keep segments contiguous and ordered
- cover the full transcript
- max 4 segments
- do not invent content not present in the transcript
- if the memo stays on one topic, return one segment
- excerpt should sound like real language from the memo, not a title
- use continuity context: a follow-up memo often responds to recently heard or currently unheard friend replies
- only attach to an existing thread when the semantic match is strong; otherwise create a new topic with null thread id
- total duration is ${durationMs}ms

${threadContextBlock}`,
        },
        { role: 'user', content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Segmentation failed (${response.status}): ${await response.text()}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content);
    const segments = Array.isArray(parsed?.segments) ? parsed.segments : [];
    return normalizeSegments(segments, transcript, durationMs, threadContext);
  } catch {
    return normalizeSegments([], transcript, durationMs, threadContext);
  }
}

function normalizeSegments(segments, transcript, durationMs, threadContext) {
  const validThreadIds = new Set(threadContext.map(thread => thread.id));

  if (!segments.length) {
    return [
      {
        label: 'voice memo',
        excerpt: clipExcerpt(transcript),
        transcript,
        start_ms: 0,
        end_ms: durationMs || 0,
        assigned_thread_id: null,
      },
    ];
  }

  return segments.map((segment, index) => {
    const startMs = Number.isFinite(segment.start_ms) ? segment.start_ms : 0;
    const fallbackEnd = durationMs || startMs;
    const endMs = Number.isFinite(segment.end_ms) ? segment.end_ms : fallbackEnd;
    const assignedThreadId = typeof segment.assigned_thread_id === 'string' && validThreadIds.has(segment.assigned_thread_id)
      ? segment.assigned_thread_id
      : null;

    return {
      label: typeof segment.label === 'string' && segment.label.trim()
        ? segment.label.trim()
        : `topic ${index + 1}`,
      excerpt: typeof segment.excerpt === 'string' && segment.excerpt.trim()
        ? segment.excerpt.trim()
        : clipExcerpt(segment.transcript || transcript),
      transcript: typeof segment.transcript === 'string' && segment.transcript.trim()
        ? segment.transcript.trim()
        : transcript,
      start_ms: Math.max(0, startMs),
      end_ms: Math.max(Math.max(0, startMs), endMs),
      assigned_thread_id: assignedThreadId,
    };
  });
}

function clipExcerpt(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return words.slice(0, 14).join(' ');
}
