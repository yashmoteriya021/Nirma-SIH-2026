import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  partner_id:   { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true },
  partner_type: { type: String, enum: ['SCA', 'PSB', 'RRB', 'NBFC_MFI'], required: true },
  address:      { type: String, required: true },
  pincode:      { type: String, required: true },
  latitude:     { type: Number, required: true },
  longitude:    { type: Number, required: true },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },   // [longitude, latitude] — auto-set by pre-validate hook
  },
  npa_rate:     { type: Number, required: true },
  fund_status:  { type: String, enum: ['available', 'exhausted'], default: 'available' },
  supported_schemes: [{ type: String }],
  contact_phone:     { type: String, required: true },
}, { timestamps: true });

// 2dsphere geospatial index for nearby partner search
partnerSchema.index({ location: '2dsphere' });

// Pre-validate hook: keep location.coordinates in sync with latitude/longitude
partnerSchema.pre('validate', function (next) {
  if (this.longitude != null && this.latitude != null) {
    this.location = { type: 'Point', coordinates: [this.longitude, this.latitude] };
  }
  next();
});

const ChannelPartner = mongoose.model('ChannelPartner', partnerSchema);

export default ChannelPartner;
