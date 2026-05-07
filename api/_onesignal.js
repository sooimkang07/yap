const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications?c=push';

function isOneSignalConfigured() {
  return !!(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY);
}

async function sendPushNotification({ recipientIds, heading, message, url, data = {} }) {
  const ids = [...new Set((recipientIds || []).map(id => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return [];
  if (!isOneSignalConfigured()) {
    const error = new Error('OneSignal is not configured.');
    error.statusCode = 503;
    error.hint = 'Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in Vercel environment variables.';
    throw error;
  }

  const response = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: process.env.ONESIGNAL_APP_ID,
      include_aliases: {
        external_id: ids,
      },
      target_channel: 'push',
      headings: {
        en: heading || 'yAp',
      },
      contents: {
        en: message || 'You have a new yAp.',
      },
      url: url || undefined,
      data,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.errors ? JSON.stringify(payload.errors) : `OneSignal push failed (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }

  return ids.map(id => ({
    id,
    status: payload?.id ? 'sent' : 'accepted_without_subscription',
    messageId: payload?.id || null,
    errors: payload?.errors || null,
  }));
}

module.exports = {
  isOneSignalConfigured,
  sendPushNotification,
};
