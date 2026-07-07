const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send a project invite email via SendGrid.
 *
 * @param {string} toEmail       - Recipient email
 * @param {string} projectName   - Name of the project
 * @param {string} inviterName   - Name of the person who sent the invite
 * @param {string} inviteToken   - UUID token for the invite link
 */
const sendInviteEmail = async (toEmail, projectName, inviterName, inviteToken) => {
  const inviteLink = `${process.env.APP_URL}/invites/accept?token=${inviteToken}`;

  const msg = {
    to: toEmail,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: `You've been invited to join "${projectName}" on TeamSphere`,
    html: `
      <h2>You're invited!</h2>
      <p><strong>${inviterName}</strong> has invited you to join the project
         <strong>${projectName}</strong> on TeamSphere.</p>
      <p>This invitation expires in 72 hours.</p>
      <p>
        <a href="${inviteLink}"
           style="background:#3b82d4;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">
          Accept Invitation
        </a>
      </p>
      <p style="color:#888;font-size:12px;">
        Or copy this link: ${inviteLink}
      </p>
    `,
  };

  try {
    await sgMail.send(msg);
    logger.info(`Invite email sent to ${toEmail}`);
  } catch (err) {
    logger.error(`SendGrid error: ${err.message}`);
    throw new Error('Failed to send invite email');
  }
};

module.exports = { sendInviteEmail };
