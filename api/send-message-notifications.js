const { ensureLocalEnv } = require('./_env');
const { sendSms } = require('./_twilio');

ensureLocalEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ route: '/api/send-message-notifications', error: 'Method not allowed' });
  }

  try {
    const body = await readJson(req);
    const chatName = String(body?.chatName || 'your yAp chat').trim() || 'your yAp chat';
    const senderName = String(body?.senderName || 'A friend').trim() || 'A friend';
    const threadLabel = String(body?.threadLabel || 'new voice message').trim() || 'new voice message';
    const transcript = String(body?.transcript || '').trim();
    const baseUrl = String(body?.baseUrl || '').trim();
    const recipients = Array.isArray(body?.recipients) ? body.recipients : [];
    const isReply = !!body?.isReply;
    const kind = String(body?.kind || 'message').trim() || 'message';

    const results = [];

    for (const recipient of recipients) {
      if (!recipient?.id || !recipient?.phone_e164) continue;

      const openUrl = buildChatUrl(baseUrl, body?.chatId);
      const greeting = recipient.name ? `Hi ${recipient.name}, ` : '';
      const message = kind === 'chat_invite'
        ? `${greeting}${senderName} added you to "${chatName}" on yAp. Open the chat: ${openUrl}`
        : buildMessageNotification({
            greeting,
            senderName,
            chatName,
            threadLabel,
            transcript,
            isReply,
            openUrl,
          });

      try {
        await sendSms(recipient.phone_e164, message);
        results.push({ id: recipient.id, status: 'sent' });
      } catch (error) {
        results.push({
          id: recipient.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown SMS delivery error',
        });
      }
    }

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      route: '/api/send-message-notifications',
      error: error instanceof Error ? error.message : 'Unknown notification error',
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

function buildChatUrl(baseUrl, chatId) {
  const url = new URL(baseUrl || 'http://localhost:3000');
  if (chatId) url.searchParams.set('chat', chatId);
  return url.toString();
}

function clipText(text, maxWords = 18) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function buildMessageNotification({ greeting, senderName, chatName, threadLabel, transcript, isReply, openUrl }) {
  const opener = isReply ? 'sent a voice reply' : 'sent a new yAp';
  const preview = transcript ? ` "${clipText(transcript, 18)}"` : '';
  return `${greeting}${senderName} ${opener} in "${chatName}" about ${threadLabel}.${preview} Open: ${openUrl}`;
}
