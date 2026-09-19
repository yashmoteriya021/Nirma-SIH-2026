import mongoose from 'mongoose';

const localizedStringSchema = new mongoose.Schema({
  en: { type: String, required: true },
  hi: { type: String, required: true },
}, { _id: false });

const localizedArraySchema = new mongoose.Schema({
  en: [{ type: String, required: true }],
  hi: [{ type: String, required: true }],
}, { _id: false });

const faqSchema = new mongoose.Schema({
  q: { type: String, required: true },
  a: { type: String, required: true },
}, { _id: false });

const localizedFaqArraySchema = new mongoose.Schema({
  en: [faqSchema],
  hi: [faqSchema],
}, { _id: false });

const schemeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: localizedStringSchema, required: true },
  category: { type: localizedStringSchema, required: true },
  scheme_type: { type: String, enum: ['loan', 'scholarship', 'skilling', 'grant'], default: 'loan' },
  description: { type: localizedStringSchema, required: true },
  
  maxAmount: { type: Number, required: true },
  interestRate: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  fundingPercent: { type: Number, required: true },
  moratoriumMonths: [{ type: Number }],
  tenureMonths: { type: Number, required: true },
  incomeLimit: { type: Number, required: true },
  
  eligibility: { type: localizedArraySchema, required: true },
  documents: { type: localizedArraySchema, required: true },
  applicationProcess: { type: localizedArraySchema, required: true },
  faqs: { type: localizedFaqArraySchema, required: true },
  
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

schemeSchema.index({ 'name.en': 'text', 'name.hi': 'text', 'description.en': 'text', 'description.hi': 'text' });

const Scheme = mongoose.model('Scheme', schemeSchema);

export default Scheme;
