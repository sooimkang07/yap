module.exports = async function handler(req, res) {
  let rawBody = '';

  for await (const chunk of req) {
    rawBody += chunk.toString();
  }

  return res.status(200).json({
    method: req.method,
    headers: req.headers,
    rawBody: rawBody,
    bodyLength: rawBody.length,
    parsed: rawBody ? JSON.parse(rawBody) : null
  });
};
