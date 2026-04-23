const { ensureLocalEnv } = require('./_env');
const { createVerification } = require('./_twilio');

ensureLocalEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ route: '/api/send-phone-code', error: 'Method not allowed' });
  }

  try {
    const body = await readJson(req);
    const phone = normalizePhone(body?.phone);
    if (!phone) {
      return res.status(400).json({ route: '/api/send-phone-code', error: 'Enter a valid phone number.' });
    }

    const result = await createVerification(phone);
    return res.status(200).json({
      route: '/api/send-phone-code',
      status: result.status || 'pending',
      phone,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      route: '/api/send-phone-code',
      error: error instanceof Error ? error.message : 'Unknown send code error',
      hint: error?.hint || null,
    });
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

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return String(value || '').trim().startsWith('+') ? String(value).trim() : `+${digits}`;
}
