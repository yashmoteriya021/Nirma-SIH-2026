import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  full_name:     { type: String },
  mobile_number: { type: String, required: true, unique: true },
  email:         { type: String, unique: true, sparse: true },
  password_hash: { type: String },
  preferred_language: { type: String, enum: ['en', 'hi', 'gu'], default: 'en' },
  is_verified:   { type: Boolean, default: false },
}, { timestamps: true });

/**
 * Hash password before saving (only if password_hash is modified).
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash') || !this.password_hash) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compare a candidate password against the stored hash.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password_hash) return false;
  return bcrypt.compare(candidatePassword, this.password_hash);
};

/**
 * Strip sensitive fields when converting to JSON.
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password_hash;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
