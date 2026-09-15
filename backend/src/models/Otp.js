import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true },
  otp_code:      { type: String, required: true },
  expires_at:    { type: Date, required: true },
});

// TTL index: MongoDB automatically deletes documents after expires_at
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
