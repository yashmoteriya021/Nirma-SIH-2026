import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Otp from '../models/Otp.js';
import config from '../config/env.js';

let transporter;
if (!config.otp.mockMode && config.smtp.user && config.smtp.pass) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

/**
 * OTP Service — abstracted behind an interface so a real SMS provider
 * (MSG91, Twilio, etc.) can be swapped in later with zero controller changes.
 *
 * When OTP_MOCK_MODE=true (default for local dev):
 *   - OTP is logged to console
 *   - OTP is returned in the API response
 *
 * When OTP_MOCK_MODE=false:
 *   - Replace the `sendViaSMS` function with real provider integration
 */

/**
 * Generate a cryptographically random 6-digit OTP.
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const sendViaEmail = async (email, otpCode) => {
  if (config.otp.mockMode) {
    console.log(`\n  📧 [MOCK OTP] Sending to ${email}: ${otpCode}\n`);
    return true;
  }

  if (!transporter) {
    throw new Error('Email provider not configured. Provide SMTP credentials in .env or set OTP_MOCK_MODE=true.');
  }

  const mailOptions = {
    from: `"SchemeSetu" <${config.smtp.user}>`,
    to: email,
    subject: 'Your SchemeSetu Verification Code',
    text: `Your verification code is: ${otpCode}. It will expire in ${config.otp.expiryMinutes} minutes.`,
    html: `<p>Your verification code is: <strong>${otpCode}</strong>.</p><p>It will expire in ${config.otp.expiryMinutes} minutes.</p>`,
  };

  await transporter.sendMail(mailOptions);
  return true;
};

/**
 * Send OTP via SMS (mock or real provider).
 * @param {string} mobileNumber
 * @param {string} otpCode
 * @returns {Promise<boolean>}
 */
const sendViaSMS = async (mobileNumber, otpCode) => {
  if (config.otp.mockMode) {
    console.log(`\n  📱 [MOCK OTP] Sending to ${mobileNumber}: ${otpCode}\n`);
    return true;
  }

  if (!config.fast2sms.apiKey) {
    throw new Error('SMS provider not configured. Provide FAST2SMS_API_KEY in .env or set OTP_MOCK_MODE=true.');
  }

  try {
    // Fast2SMS expects 10-digit number without country code
    const cleanNumber = mobileNumber.replace('+91', '').replace(/\D/g, '');
    
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${config.fast2sms.apiKey}&variables_values=${otpCode}&route=otp&numbers=${cleanNumber}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.return) {
      throw new Error(data.message || 'Fast2SMS returned an error');
    }
    
    return true;
  } catch (error) {
    console.error(`\n❌ [FAST2SMS ERROR]: Failed to send SMS to ${mobileNumber}.`);
    console.error(`Reason: ${error.message}`);
    console.log(`\n  📱 [FALLBACK MOCK OTP] Since Fast2SMS failed, here is your code for ${mobileNumber}: ${otpCode}\n`);
    
    // We return true so the frontend still shows the modal and allows them to enter the fallback code.
    return true;
  }
};

/**
 * Create and send an OTP for the given identifier.
 * Removes any existing OTPs for the same identifier first.
 */
export const createAndSendOTP = async (identifier, type) => {
  // Remove any existing OTPs for this identifier
  await Otp.deleteMany({ identifier });

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  await Otp.create({
    identifier,
    otp_code: otpCode,
    expires_at: expiresAt,
  });

  if (type === 'email') {
    await sendViaEmail(identifier, otpCode);
  } else {
    await sendViaSMS(identifier, otpCode);
  }

  return {
    sent: true,
    expires_in_minutes: config.otp.expiryMinutes,
    // Only include OTP in response in mock mode (for dev convenience)
    ...(config.otp.mockMode && { otp_code: otpCode }),
  };
};

/**
 * Verify an OTP code for the given identifier.
 * @returns {boolean} true if valid, false otherwise
 */
export const verifyOTP = async (identifier, otpCode) => {
  const record = await Otp.findOne({
    identifier,
    otp_code: otpCode,
    expires_at: { $gt: new Date() },
  });

  if (!record) return false;

  // OTP is single-use: delete after successful verification
  await Otp.deleteMany({ identifier });
  return true;
};
