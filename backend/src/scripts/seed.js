import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Scheme from '../models/Scheme.js';
import ChannelPartner from '../models/ChannelPartner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const schemesPath = path.join(__dirname, '../../../frontend/src/data/schemes.json');
const partnersPath = path.join(__dirname, '../../../frontend/src/data/partners.json');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing by dropping collections to remove old indexes
    try { await Scheme.collection.drop(); } catch (e) {}
    try { await ChannelPartner.collection.drop(); } catch (e) {}
    console.log('Dropped existing schemes and partners collections.');

    // Read JSONs
    const schemesData = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));
    const partnersData = JSON.parse(fs.readFileSync(partnersPath, 'utf8'));

    // Insert Schemes
    await Scheme.insertMany(schemesData.schemes);
    console.log(`Inserted ${schemesData.schemes.length} schemes.`);

    // Insert Partners
    await ChannelPartner.insertMany(partnersData.partners);
    console.log(`Inserted ${partnersData.partners.length} partners.`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedDB();
