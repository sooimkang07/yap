const { ensureLocalEnv } = require('./_env');

ensureLocalEnv();

const DEFAULT_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe';
const DEFAULT_SEGMENT_MODEL = process.env.OPENAI_SEGMENT_MODEL || 'gpt-4o';
const TIMESTAMP_TRANSCRIBE_MODEL = process.env.OPENAI_TIMESTAMP_TRANSCRIBE_MODEL || 'whisper-1';

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

    const transcription = await transcribeAudio(body, contentType);
    const transcript = transcription.text || '';
    const segments = transcript
      ? await segmentTranscript(transcript, durationMs, threadContext, transcription.words || [])
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
      words: transcription.words || null,
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
  const [textResult, timestampResult] = await Promise.all([
    transcribeText(buffer, contentType),
    transcribeWordTimestamps(buffer, contentType).catch(error => {
      console.warn('[yAp] timestamp transcription fallback failed:', error);
      return { words: [] };
    }),
  ]);

  return {
    text: normalizeWhitespace(textResult?.text || ''),
    words: Array.isArray(timestampResult?.words) ? timestampResult.words : [],
  };
}

async function transcribeText(buffer, contentType) {
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
  return { text: (json.text || '').trim() };
}

async function transcribeWordTimestamps(buffer, contentType) {
  const form = new FormData();
  const extension = contentType.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob([buffer], { type: contentType });

  form.append('file', blob, `recording.${extension}`);
  form.append('model', TIMESTAMP_TRANSCRIBE_MODEL);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Timestamp transcription failed (${response.status}): ${await response.text()}`);
  }

  const json = await response.json();
  return {
    words: normalizeWordTimestamps(json.words),
  };
}

async function segmentTranscript(transcript, durationMs, threadContext, wordTimestamps = []) {
  const normalizedTranscript = normalizeWhitespace(transcript);
  const threadContextBlock = threadContext.length
    ? `Existing topic threads:
${JSON.stringify(threadContext, null, 2)}

Interpretation rules for the thread metadata:
- "unheardCount" means the user has friend replies in that thread they have not finished hearing yet
- "lastHeardAt" means the user most recently listened to that thread around that time
- "recentlyPlayed" means the user very recently finished listening to that thread
- "lastPlayedMessage" contains the exact friend message they most recently heard in that thread
- when a semantic match is plausible, prioritize threads with recent heard context or unheard replies before older unrelated threads
- if the transcript sounds like a direct response to the recently played message, prefer attaching that segment to the same thread
- if only part of the memo responds to that recently played message, attach only that part and keep unrelated parts as new topics

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
- "start_anchor": the first 3-10 exact words of that segment, copied verbatim from the transcript
- "start_ms": approximate start time
- "end_ms": approximate end time
- "assigned_thread_id": an existing thread id or null

Rules:
- detect genuine topic shifts from discourse and sentence structure
- prefer fewer segments when the boundary is ambiguous
- do not split a memo just because it has extra detail, an aside, or another sentence on the same subject
- split only when the speaker clearly changes subject, starts a new plan/request/story, or directly pivots into a different reply target
- keep segments contiguous and ordered
- cover the full transcript
- max 4 segments
- do not invent content not present in the transcript
- if the memo stays on one topic, return one segment
- every segment transcript must be a verbatim contiguous span from the original transcript, with no paraphrasing or cleanup
- excerpt should sound like real language from the memo, not a title
- use continuity context: a follow-up memo often responds to recently heard or currently unheard friend replies
- the user may respond right after listening to a friend's voice note; use "recentlyPlayed" and "lastPlayedMessage" as strong but not absolute signals
- only attach to an existing thread when the semantic match is strong; otherwise create a new topic with null thread id
- total duration is ${durationMs}ms

${threadContextBlock}`,
        },
        { role: 'user', content: normalizedTranscript },
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
    return normalizeSegments(segments, normalizedTranscript, durationMs, threadContext, wordTimestamps);
  } catch {
    return normalizeSegments([], normalizedTranscript, durationMs, threadContext, wordTimestamps);
  }
}

function normalizeSegments(segments, transcript, durationMs, threadContext, wordTimestamps = []) {
  const validThreadIds = new Set(threadContext.map(thread => thread.id));
  const normalizedTranscript = normalizeWhitespace(transcript);
  const trimmedSegments = Array.isArray(segments) ? segments.slice(0, 4) : [];

  if (!trimmedSegments.length) {
    return [
      {
        label: 'voice memo',
        excerpt: clipExcerpt(normalizedTranscript),
        transcript: normalizedTranscript,
        start_ms: 0,
        end_ms: durationMs || 0,
        assigned_thread_id: null,
      },
    ];
  }

  const reconstructedTranscripts = rebuildSegmentTranscripts(trimmedSegments, normalizedTranscript);
  const segmentTexts = reconstructedTranscripts || trimmedSegments.map(segment => normalizeWhitespace(segment?.transcript || ''));
  const alignedBoundaries = alignSegmentBoundariesFromWords(segmentTexts, wordTimestamps, durationMs);
  const durationBoundaries = alignedBoundaries.length
    ? alignedBoundaries
    : computeSegmentBoundaries(segmentTexts, durationMs);

  return trimmedSegments.map((segment, index) => {
    const assignedThreadId = typeof segment.assigned_thread_id === 'string' && validThreadIds.has(segment.assigned_thread_id)
      ? segment.assigned_thread_id
      : null;
    const reconstructedTranscript = normalizeWhitespace(reconstructedTranscripts?.[index] || '');
    const fallbackTranscript = normalizeWhitespace(segment?.transcript || '');
    const segmentTranscript = reconstructedTranscript || fallbackTranscript || normalizedTranscript;
    const startMs = Number.isFinite(durationBoundaries[index]?.start_ms)
      ? durationBoundaries[index].start_ms
      : Math.max(0, Number(segment.start_ms) || 0);
    const fallbackEnd = durationMs || startMs;
    const endMs = Number.isFinite(durationBoundaries[index]?.end_ms)
      ? durationBoundaries[index].end_ms
      : Math.max(startMs, Number(segment.end_ms) || fallbackEnd);

    return {
      label: typeof segment.label === 'string' && segment.label.trim()
        ? segment.label.trim()
        : `topic ${index + 1}`,
      excerpt: typeof segment.excerpt === 'string' && segment.excerpt.trim()
        ? segment.excerpt.trim()
        : clipExcerpt(segmentTranscript),
      transcript: segmentTranscript,
      start_ms: Math.max(0, startMs),
      end_ms: Math.max(Math.max(0, startMs), endMs),
      assigned_thread_id: assignedThreadId,
    };
  });
}

function clipExcerpt(text) {
  const words = normalizeWhitespace(text).split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return words.slice(0, 14).join(' ');
}

function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function leadingWords(text, count = 8) {
  const words = normalizeWhitespace(text).split(/\s+/).filter(Boolean);
  return words.slice(0, count).join(' ');
}

function findAnchorIndex(transcript, anchor, fromIndex = 0) {
  const source = normalizeWhitespace(transcript).toLowerCase();
  const needle = normalizeWhitespace(anchor).toLowerCase();
  if (!source || !needle) return -1;
  return source.indexOf(needle, Math.max(0, fromIndex));
}

function rebuildSegmentTranscripts(segments, transcript) {
  const source = normalizeWhitespace(transcript);
  if (!source || !Array.isArray(segments) || !segments.length) return null;
  if (segments.length === 1) return [source];

  const boundaries = [0];
  let cursor = 0;

  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index] || {};
    const candidates = [
      segment.start_anchor,
      leadingWords(segment.transcript, 8),
      leadingWords(segment.excerpt, 8),
    ].filter(Boolean);

    let boundary = -1;
    for (const candidate of candidates) {
      boundary = findAnchorIndex(source, candidate, cursor);
      if (boundary > cursor) break;
    }

    if (boundary <= cursor) return null;

    boundaries.push(boundary);
    cursor = boundary;
  }

  boundaries.push(source.length);

  const slices = [];
  for (let index = 0; index < segments.length; index++) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const slice = normalizeWhitespace(source.slice(start, end));
    if (!slice) return null;
    slices.push(slice);
  }

  return slices;
}

function computeSegmentBoundaries(transcripts, durationMs) {
  if (!Array.isArray(transcripts) || !transcripts.length) return [];
  if (!(durationMs > 0)) {
    return transcripts.map((_, index) => ({
      start_ms: index === 0 ? 0 : 0,
      end_ms: 0,
    }));
  }

  const weights = transcripts.map(text => Math.max(normalizeWhitespace(text).length, 1));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;

  let consumed = 0;
  return weights.map((weight, index) => {
    const startMs = Math.round((consumed / totalWeight) * durationMs);
    consumed += weight;
    const endMs = index === weights.length - 1
      ? durationMs
      : Math.round((consumed / totalWeight) * durationMs);
    return {
      start_ms: startMs,
      end_ms: Math.max(startMs, endMs),
    };
  });
}

function normalizeWordTimestamps(words = []) {
  return (Array.isArray(words) ? words : [])
    .map(word => {
      const text = normalizeWhitespace(word?.word || word?.text || '');
      const start = Number(word?.start);
      const end = Number(word?.end);
      if (!text || !Number.isFinite(start) || !Number.isFinite(end)) return null;
      return {
        word: text,
        normalizedWord: normalizeComparableWord(text),
        start_ms: Math.max(0, Math.round(start * 1000)),
        end_ms: Math.max(0, Math.round(end * 1000)),
      };
    })
    .filter(Boolean);
}

function normalizeComparableWord(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, '')
    .trim();
}

function tokenizeComparableWords(text) {
  return normalizeWhitespace(text)
    .split(/\s+/)
    .map(normalizeComparableWord)
    .filter(Boolean);
}

function alignSegmentBoundariesFromWords(segmentTexts, wordTimestamps, durationMs) {
  const normalizedWords = (Array.isArray(wordTimestamps) ? wordTimestamps : []).filter(entry => entry?.normalizedWord);
  if (!normalizedWords.length || !Array.isArray(segmentTexts) || !segmentTexts.length) return [];

  const boundaries = [];
  let cursor = 0;

  for (const segmentText of segmentTexts) {
    const targetWords = tokenizeComparableWords(segmentText);
    if (!targetWords.length) return [];

    const match = findSequentialWordMatch(normalizedWords, targetWords, cursor);
    if (!match) return [];

    boundaries.push({
      start_ms: normalizedWords[match.startIndex]?.start_ms ?? 0,
      end_ms: normalizedWords[match.endIndex]?.end_ms ?? durationMs ?? 0,
    });
    cursor = match.endIndex + 1;
  }

  return boundaries.map((boundary, index) => ({
    start_ms: Math.max(0, Number(boundary.start_ms) || 0),
    end_ms: Math.max(
      Math.max(0, Number(boundary.start_ms) || 0),
      index === boundaries.length - 1
        ? Math.max(Number(boundary.end_ms) || 0, durationMs || 0)
        : Number(boundary.end_ms) || 0
    ),
  }));
}

function findSequentialWordMatch(sourceWords, targetWords, fromIndex = 0) {
  if (!Array.isArray(sourceWords) || !Array.isArray(targetWords) || !targetWords.length) return null;

  let sourceIndex = Math.max(0, fromIndex);
  let targetIndex = 0;
  let startIndex = -1;
  let endIndex = -1;

  while (sourceIndex < sourceWords.length && targetIndex < targetWords.length) {
    if (sourceWords[sourceIndex].normalizedWord === targetWords[targetIndex]) {
      if (startIndex < 0) startIndex = sourceIndex;
      endIndex = sourceIndex;
      targetIndex += 1;
    }
    sourceIndex += 1;
  }

  if (targetIndex !== targetWords.length || startIndex < 0 || endIndex < startIndex) {
    return null;
  }

  return { startIndex, endIndex };
}
