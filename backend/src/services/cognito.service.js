const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * Build the Cognito Hosted UI login redirect URL.
 */
const getCognitoLoginUrl = () => {
  const redirectUri = `${process.env.APP_URL}/auth/callback`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.COGNITO_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
  });
  return `${process.env.COGNITO_DOMAIN}/login?${params.toString()}`;
};

/**
 * Exchange authorization code for Cognito tokens.
 * No client secret — app client is configured without one in Cognito.
 * redirect_uri must match exactly what was sent in the login URL and what is
 * registered as an allowed callback URL in the Cognito App Client settings.
 * Returns the decoded id_token payload.
 */
const exchangeCodeForTokens = async (code) => {
  const redirectUri = `${process.env.APP_URL}/auth/callback`;
  const { data } = await axios.post(
    `${process.env.COGNITO_DOMAIN}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.COGNITO_CLIENT_ID,
      redirect_uri: redirectUri,
      code,
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  // Decode the id_token (we trust Cognito; skip full JWKS verification for simplicity)
  const decoded = jwt.decode(data.id_token);
  return decoded;
};

/**
 * Issue a TeamSphere JWT for the given user.
 */
const issueAppToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, systemRole: user.systemRole || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

module.exports = { getCognitoLoginUrl, exchangeCodeForTokens, issueAppToken };
