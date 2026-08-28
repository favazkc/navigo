package com.navigo.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@example.com}")
    private String fromEmail;

    @Value("${app.url:http://localhost:2000}")
    private String appUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send a project invite email via Spring Mail (SendGrid SMTP relay).
     * Mirrors sendInviteEmail() in email.service.js.
     */
    public void sendInviteEmail(String toEmail, String projectName,
                                 String inviterName, String inviteToken) throws Exception {
        String inviteLink = appUrl + "/invites/accept?token=" + inviteToken;

        String html = """
                <h2>You're invited!</h2>
                <p><strong>%s</strong> has invited you to join the project
                   <strong>%s</strong> on Navigo.</p>
                <p>This invitation expires in 72 hours.</p>
                <p>
                  <a href="%s"
                     style="background:#3b82d4;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">
                    Accept Invitation
                  </a>
                </p>
                <p style="color:#888;font-size:12px;">
                  Or copy this link: %s
                </p>
                """.formatted(inviterName, projectName, inviteLink, inviteLink);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(toEmail);
        helper.setFrom(fromEmail);
        helper.setSubject("You've been invited to join \"" + projectName + "\" on Navigo");
        helper.setText(html, true);

        try {
            mailSender.send(message);
            log.info("Invite email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Mail send error: {} — cause: {}", e.getMessage(), e.getCause() != null ? e.getCause().getMessage() : "none", e);
            throw new Exception("Failed to send invite email", e);
        }
    }
}
