import mongoose from 'mongoose';

const schemeSchema = new mongoose.Schema({
  scheme_id: { type: String, required: true, unique: true, index: true },
  name:      { type: String, required: true },
  category:  { type: String, enum: ['business', 'education'], required: true },
  sub_type:  { type: String, enum: ['micro', 'major', 'general'], required: true },
  max_cost_limit:    { type: Number, required: true },
  govt_share_pct:    { type: Number, required: true },
  promoter_share_pct:{ type: Number, required: true },
  interest_rate_pct: { type: Number, required: true },
  women_rebate_pct:  { type: Number, default: 0 },
  max_tenure_years:  { type: Number, required: true },
  moratorium_months: { type: Number, required: true },
  description: {
    en: { type: String, required: true },
    hi: { type: String, required: true },
    gu: { type: String },
  },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// Text index for search across name and description fields
schemeSchema.index({ name: 'text', 'description.en': 'text', 'description.hi': 'text' });

const Scheme = mongoose.model('Scheme', schemeSchema);

export default Scheme;
