import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheme_id:  { type: String },
  partner_id: { type: String },
  project_cost:  { type: Number },
  annual_income: { type: Number },
  status: {
    type: String,
    enum: ['recommended', 'contacted', 'in_progress', 'disbursed'],
    default: 'recommended',
  },
}, { timestamps: true });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
