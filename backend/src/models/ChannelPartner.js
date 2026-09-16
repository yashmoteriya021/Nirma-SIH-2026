import mongoose from 'mongoose';

const localizedStringSchema = new mongoose.Schema({
  en: { type: String, required: true },
  hi: { type: String, required: true },
}, { _id: false });

const partnerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: localizedStringSchema, required: true },
  type: { type: String, required: true }, // e.g. "SCA", "Public Sector Bank"
  city: { type: localizedStringSchema, required: true },
  state: { type: localizedStringSchema, required: true },
  address: { type: localizedStringSchema, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  phone: { type: String, required: true },
  status: { type: String, enum: ['accepting', 'paused'], default: 'accepting' },
  schemesSupported: [{ type: String }],
  
  // GeoJSON for spatial queries
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
}, { timestamps: true });

partnerSchema.index({ location: '2dsphere' });

partnerSchema.pre('validate', function (next) {
  if (this.lng != null && this.lat != null) {
    this.location = { type: 'Point', coordinates: [this.lng, this.lat] };
  }
  next();
});

const ChannelPartner = mongoose.model('ChannelPartner', partnerSchema);

export default ChannelPartner;
