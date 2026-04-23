const { ensureLocalEnv } = require('./_env');
const { sendSms } = require('./_twilio');

ensureLocalEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ route: '/api/send-invites', error: 'Method not allowed' });
  }

  try {
    const body = await readJson(req);
    const inviterName = String(body?.inviterName || 'A friend').trim() || 'A friend';
    const chatName = String(body?.chatName || 'a yAp group').trim() || 'a yAp group';
    const baseUrl = String(body?.baseUrl || '').trim();
    const invites = Array.isArray(body?.invites) ? body.invites : [];

    const results = [];
    for (const invite of invites) {
      if (!invite?.id || !invite?.invite_token || !invite?.phone_e164) continue;

      const joinUrl = buildJoinUrl(baseUrl, invite.invite_token);
      const inviteeName = String(invite.invitee_name || '').trim();
      const greeting = inviteeName ? `Hi ${inviteeName}, ` : '';
      const message = `${greeting}${inviterName} invited you to join "${chatName}" on yAp. Open your invite: ${joinUrl}`;

      try {
        await sendSms(invite.phone_e164, message);
        results.push({ id: invite.id, status: 'sent' });
      } catch (error) {
        results.push({
          id: invite.id,
          status: 'pending',
          error: error instanceof Error ? error.message : 'Unknown SMS delivery error',
        });
      }
    }

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      route: '/api/send-invites',
      error: error instanceof Error ? error.message : 'Unknown invite error',
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

function buildJoinUrl(baseUrl, inviteToken) {
  const url = new URL(baseUrl || 'http://localhost:3000');
  url.searchParams.set('invite', inviteToken);
  return url.toString();
}
