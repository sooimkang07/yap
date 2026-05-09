const { ensureLocalEnv } = require('./_env');
const { sendSms } = require('./_twilio');

ensureLocalEnv();

const DEFAULT_SUPABASE_URL = 'https://maigiwxpyganbhpwbejd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1haWdpd3hweWdhbmJocHdiZWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDU5NzUsImV4cCI6MjA5MTg4MTk3NX0.7I1jRIXrd7IsLxAkqIeT8VZgwNDA2BjBdQBsCVmXe1Y';
const MAX_JOBS_PER_RUN = 25;
const MAX_ATTEMPTS = 5;

module.exports = async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ route: '/api/process-notification-jobs', error: 'Method not allowed' });
  }

  try {
    const jobs = await fetchPendingJobs();
    const results = [];

    for (const job of jobs) {
      const processingJob = await markJobProcessing(job);
      if (!processingJob) continue;

      try {
        await sendSms(processingJob.recipient_phone_e164, buildSmsBody(processingJob));
        await updateJob(processingJob.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        });
        results.push({ id: processingJob.id, status: 'sent' });
      } catch (error) {
        const attemptCount = Number(processingJob.attempt_count || 0);
        const failedPermanently = attemptCount >= MAX_ATTEMPTS;
        const lastError = error instanceof Error ? error.message : 'Unknown SMS delivery error';

        await updateJob(processingJob.id, {
          status: failedPermanently ? 'failed' : 'pending',
          last_error: lastError,
          next_attempt_at: failedPermanently ? null : nextRetryAt(attemptCount),
          updated_at: new Date().toISOString(),
        });

        results.push({
          id: processingJob.id,
          status: failedPermanently ? 'failed' : 'pending',
          error: lastError,
        });
      }
    }

    return res.status(200).json({
      route: '/api/process-notification-jobs',
      processed: results.length,
      results,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      route: '/api/process-notification-jobs',
      error: error instanceof Error ? error.message : 'Unknown notification job error',
      hint: error?.hint || null,
    });
  }
};

async function fetchPendingJobs() {
  const url = new URL(`${supabaseUrl()}/rest/v1/notification_jobs`);
  url.searchParams.set('select', '*');
  url.searchParams.set('status', 'eq.pending');
  url.searchParams.set('next_attempt_at', `lte.${new Date().toISOString()}`);
  url.searchParams.set('order', 'created_at.asc');
  url.searchParams.set('limit', String(MAX_JOBS_PER_RUN));

  const response = await fetch(url, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Notification jobs query failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function markJobProcessing(job) {
  const nextAttemptCount = Number(job.attempt_count || 0) + 1;
  const response = await fetch(`${supabaseUrl()}/rest/v1/notification_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.pending`, {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      status: 'processing',
      attempt_count: nextAttemptCount,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Notification job claim failed (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : null;
}

async function updateJob(jobId, patch) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/notification_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    headers: supabaseHeaders(),
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(`Notification job update failed (${response.status}): ${await response.text()}`);
  }
}

function buildSmsBody(job) {
  const recipientName = String(job.recipient_name || '').trim();
  const senderName = String(job.sender_name || 'A friend').trim() || 'A friend';
  const chatName = String(job.chat_name || 'your yAp chat').trim() || 'your yAp chat';
  const threadLabel = String(job.thread_label || 'new voice message').trim() || 'new voice message';
  const transcript = String(job.transcript || '').trim();
  const targetUrl = String(job.target_url || '').trim();
  const greeting = recipientName ? `Hi ${recipientName}, ` : '';

  if (job.kind === 'chat_invite') {
    return `${greeting}${senderName} added you to "${chatName}" on yAp.${targetUrl ? ` Open: ${targetUrl}` : ''}`;
  }

  const opener = job.kind === 'reply' ? 'sent a voice reply' : 'sent a new yAp';
  const preview = transcript ? ` "${clipText(transcript, 18)}"` : '';
  return `${greeting}${senderName} ${opener} in "${chatName}" about ${threadLabel}.${preview}${targetUrl ? ` Open: ${targetUrl}` : ''}`;
}

function clipText(text, maxWords = 18) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function nextRetryAt(attemptCount) {
  const delaySeconds = Math.min(15 * Math.pow(2, Math.max(0, attemptCount - 1)), 300);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

function supabaseUrl() {
  const value = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  if (!value) {
    const error = new Error('Supabase URL is not configured. Missing: SUPABASE_URL.');
    error.statusCode = 500;
    throw error;
  }
  return value.replace(/\/+$/, '');
}

function supabaseKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (!value) {
    const error = new Error('Supabase API key is not configured. Missing: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function supabaseHeaders() {
  const key = supabaseKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}
