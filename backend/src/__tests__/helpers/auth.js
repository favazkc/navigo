const jwt = require('jsonwebtoken');

/**
 * Issue a test JWT for a given User document (same shape as issueAppToken).
 */
function makeToken(user) {
  return jwt.sign(
    { email: user.email, systemRole: user.systemRole || 'user' },
    process.env.JWT_SECRET,
    { subject: user._id.toString(), expiresIn: '1h' }
  );
}

module.exports = { makeToken };
