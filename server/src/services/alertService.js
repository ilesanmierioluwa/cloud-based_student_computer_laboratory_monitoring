const config = require('../config/env');

exports.sendAlert = async (subject, text, html) => {
  try {
    const apiKey = config.brevoApiKey;
    const fromEmail = config.brevoSenderEmail;

    if (!apiKey || !fromEmail) {
      console.warn('Brevo email skipped: BREVO_API or BREVO_SENDER_EMAIL not configured');
      return;
    }

    const toEmail = config.alertEmail || fromEmail;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: 'Cloud Lab Monitoring' },
        to: [{ email: toEmail }],
        subject,
        textContent: text || subject,
        htmlContent: html || `<p>${text || subject}</p>`,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Brevo email failed (${response.status}):`, errBody);
      return;
    }

    console.log('Brevo alert email sent to', toEmail);
  } catch (error) {
    console.error('Brevo email sending failed:', error.message);
  }
};