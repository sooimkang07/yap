const { ensureLocalEnv } = require('./_env');
const { checkVerification } = require('./_twilio');

ensureLocalEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ route: '/api/verify-phone-code', error: 'Method not allowed' });
  }

  try {
    const body = await readJson(req);
    const phone = normalizePhone(body?.phone);
    const code = String(body?.code || '').trim();

    if (!phone || code.length < 6) {
      return res.status(400).json({ route: '/api/verify-phone-code', error: 'Enter the 6-digit code we texted you.' });
    }

    const result = await checkVerification(phone, code);
    if (result.status !== 'approved') {
      return res.status(401).json({ route: '/api/verify-phone-code', error: 'That code did not work. Try again.' });
    }

    return res.status(200).json({
      route: '/api/verify-phone-code',
      status: result.status,
      phone,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      route: '/api/verify-phone-code',
      error: error instanceof Error ? error.message : 'Unknown verify code error',
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
