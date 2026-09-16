import mongoose from 'mongoose';
import dns from 'dns';
import config from '../config/env.js';
import Scheme from '../models/Scheme.js';
import ChannelPartner from '../models/ChannelPartner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Data from JSON files ──────────────────────────────────────
const schemesPath = path.resolve(__dirname, '../../../frontend/src/data/schemes.json');
const partnersPath = path.resolve(__dirname, '../../../frontend/src/data/partners.json');

const schemesData = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));
const partnersData = JSON.parse(fs.readFileSync(partnersPath, 'utf8'));

const schemes = schemesData.schemes;
const partners = partnersData.partners;

// ─── Reusable Seed Function ──────────────────────────────────
/**
 * Seeds the database if it's empty.
 * Called by server.js on startup (for in-memory mode) or via `npm run seed`.
 */
export const seedDatabase = async () => {
  try {
    const schemeCount = await Scheme.countDocuments();
    const partnerCount = await ChannelPartner.countDocuments();

    if (schemeCount > 0 && partnerCount > 0) {
      console.log(`  📦 Database already seeded (${schemeCount} schemes, ${partnerCount} partners). Skipping.`);
      return;
    }

    console.log('  🌱 Seeding database...');

    // Clear and re-insert
    await Scheme.deleteMany({});
    await ChannelPartner.deleteMany({});

    const insertedSchemes = await Scheme.insertMany(schemes);
    console.log(`  ✅ Inserted ${insertedSchemes.length} schemes`);

    // Use .save() to trigger pre-save hook for coordinate sync
    let pCount = 0;
    for (const partnerData of partners) {
      const partner = new ChannelPartner(partnerData);
      await partner.save();
      pCount++;
    }
    console.log(`  ✅ Inserted ${pCount} channel partners`);
    console.log('  ✨ Seed completed!\n');
  } catch (error) {
    console.error('  ❌ Seed error:', error.message);
  }
};

// ─── Standalone CLI Mode ──────────────────────────────────────
// When run directly via `npm run seed`, connect to DB and seed
const isMainModule = process.argv[1] && process.argv[1].includes('seed.js');
if (isMainModule) {
  (async () => {
    try {
      console.log('\n  🌱 Connecting to MongoDB...');
      dns.setServers(['8.8.8.8', '8.8.4.4']);
      await mongoose.connect(config.mongodbUri);
      console.log(`  ✅ Connected to ${config.mongodbUri}\n`);
      
      // Force re-seed in CLI mode
      await Scheme.deleteMany({});
      await ChannelPartner.deleteMany({});
      
      const insertedSchemes = await Scheme.insertMany(schemes);
      console.log(`  📝 Inserted ${insertedSchemes.length} schemes`);
      
      let count = 0;
      for (const partnerData of partners) {
        const partner = new ChannelPartner(partnerData);
        await partner.save();
        count++;
      }
      console.log(`  📝 Inserted ${count} channel partners`);
      console.log('\n  ✨ Seed completed successfully!\n');
      process.exit(0);
    } catch (error) {
      console.error('\n  ❌ Seed failed:', error.message);
      process.exit(1);
    }
  })();
}
