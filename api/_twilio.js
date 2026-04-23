const VERIFY_REQUIRED_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_VERIFY_SERVICE_SID',
];

const MESSAGING_REQUIRED_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
];

function getMissingEnvKeys(keys) {
  return keys.filter(key => !process.env[key]);
}

function assertTwilioVerifyConfig() {
  const missing = getMissingEnvKeys(VERIFY_REQUIRED_KEYS);
  if (!missing.length) return;

  const error = new Error(
    `Twilio Verify is not configured. Missing: ${missing.join(', ')}.`
  );
  error.statusCode = 500;
  error.hint = 'Add the missing values to `.env.local` and restart your local server.';
  throw error;
}

function assertTwilioMessagingConfig() {
  const missing = getMissingEnvKeys(MESSAGING_REQUIRED_KEYS);
  if (!missing.length) return;

  const error = new Error(
    `Twilio messaging is not configured. Missing: ${missing.join(', ')}.`
  );
  error.statusCode = 500;
  error.hint = 'Add the missing values to `.env.local` and restart your local server.';
  throw error;
}

function buildTwilioAuthHeader() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

async function sendSms(to, body) {
  assertTwilioMessagingConfig();

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: buildTwilioAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: body,
    }),
  });

  if (!response.ok) {
    throw new Error(`Twilio SMS failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function createVerification(to) {
  assertTwilioVerifyConfig();

  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const endpoint = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: buildTwilioAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({
      To: to,
      Channel: 'sms',
    }),
  });

  if (!response.ok) {
    throw new Error(`Twilio Verify send failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function checkVerification(to, code) {
  assertTwilioVerifyConfig();

  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const endpoint = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: buildTwilioAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({
      To: to,
      Code: code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Twilio Verify check failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

module.exports = {
  assertTwilioMessagingConfig,
  assertTwilioVerifyConfig,
  sendSms,
  createVerification,
  checkVerification,
};
