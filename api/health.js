const { ensureLocalEnv } = require('./_env');

ensureLocalEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ route: '/api/health', error: 'Method not allowed' });
  }

  const checks = {
    openai: {
      ok: !!process.env.OPENAI_API_KEY,
      missing: process.env.OPENAI_API_KEY ? [] : ['OPENAI_API_KEY'],
    },
    twilioVerify: {
      ok: hasAll(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID']),
      missing: missingKeys(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID']),
    },
    twilioMessaging: {
      ok: hasAll(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER']),
      missing: missingKeys(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER']),
    },
  };

  return res.status(200).json({
    route: '/api/health',
    ok: Object.values(checks).every(check => check.ok),
    checks,
  });
};

function missingKeys(keys) {
  return keys.filter(key => !process.env[key]);
}

function hasAll(keys) {
  return missingKeys(keys).length === 0;
}
