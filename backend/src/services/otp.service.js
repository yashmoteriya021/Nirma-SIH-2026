import crypto from 'crypto';
import Otp from '../models/Otp.js';
import config from '../config/env.js';

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

  // ─── Real provider integration point ──────────────────────
  // Example with MSG91:
  //   const response = await fetch('https://api.msg91.com/api/v5/otp', {
  //     method: 'POST',
  //     headers: { 'authkey': process.env.MSG91_AUTH_KEY },
  //     body: JSON.stringify({ mobile: mobileNumber, otp: otpCode })
  //   });
  //   return response.ok;
  // ──────────────────────────────────────────────────────────

  throw new Error('SMS provider not configured. Set OTP_MOCK_MODE=true or integrate a provider.');
};

/**
 * Create and send an OTP for the given mobile number.
 * Removes any existing OTPs for the same number first.
 */
export const createAndSendOTP = async (mobileNumber) => {
  // Remove any existing OTPs for this number
  await Otp.deleteMany({ mobile_number: mobileNumber });

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  await Otp.create({
    mobile_number: mobileNumber,
    otp_code: otpCode,
    expires_at: expiresAt,
  });

  await sendViaSMS(mobileNumber, otpCode);

  return {
    sent: true,
    expires_in_minutes: config.otp.expiryMinutes,
    // Only include OTP in response in mock mode (for dev convenience)
    ...(config.otp.mockMode && { otp_code: otpCode }),
  };
};

/**
 * Verify an OTP code for the given mobile number.
 * @returns {boolean} true if valid, false otherwise
 */
export const verifyOTP = async (mobileNumber, otpCode) => {
  const record = await Otp.findOne({
    mobile_number: mobileNumber,
    otp_code: otpCode,
    expires_at: { $gt: new Date() },
  });

  if (!record) return false;

  // OTP is single-use: delete after successful verification
  await Otp.deleteMany({ mobile_number: mobileNumber });
  return true;
};
