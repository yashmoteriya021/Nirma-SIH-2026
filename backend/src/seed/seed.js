import mongoose from 'mongoose';
import dns from 'dns';
import config from '../config/env.js';
import Scheme from '../models/Scheme.js';
import ChannelPartner from '../models/ChannelPartner.js';

// ─── Mock Scheme Data ─────────────────────────────────────────
const schemes = [
  {
    scheme_id: 'mcf_01',
    name: 'Micro Credit Finance Scheme (MCF)',
    category: 'business',
    sub_type: 'micro',
    max_cost_limit: 140000,
    govt_share_pct: 90,
    promoter_share_pct: 10,
    interest_rate_pct: 7.0,
    women_rebate_pct: 0.5,
    max_tenure_years: 5,
    moratorium_months: 6,
    description: {
      en: 'Concessional credit up to ₹1.4 lakh for small-scale business and self-employment ventures, aimed at first-time SC entrepreneurs.',
      hi: 'अनुसूचित जाति के नए उद्यमियों के लिए ₹1.4 लाख तक की छोटी व्यावसायिक परियोजनाओं हेतु रियायती ऋण।',
      gu: 'SC સમુદાયના નવા ઉદ્યોગસાહસિકો માટે ₹1.4 લાખ સુધીના નાના વ્યવસાય પ્રોજેક્ટ માટે રાહત દરે ધિરાણ.',
    },
  },
  {
    scheme_id: 'term_01',
    name: 'Term Loan Scheme',
    category: 'business',
    sub_type: 'major',
    max_cost_limit: 5000000,
    govt_share_pct: 90,
    promoter_share_pct: 10,
    interest_rate_pct: 7.5,
    women_rebate_pct: 0.5,
    max_tenure_years: 7,
    moratorium_months: 12,
    description: {
      en: 'Concessional term financing up to ₹50 lakh for larger business ventures and capital-intensive projects.',
      hi: 'बड़ी व्यावसायिक परियोजनाओं के लिए ₹50 लाख तक का रियायती सावधि ऋण।',
      gu: 'મોટા વ્યવસાય પ્રોજેક્ટ્સ માટે ₹50 લાખ સુધીની રાહત દરે સાવધિ ધિરાણ.',
    },
  },
  {
    scheme_id: 'edu_01',
    name: 'Education Loan Scheme',
    category: 'education',
    sub_type: 'general',
    max_cost_limit: 2000000,
    govt_share_pct: 90,
    promoter_share_pct: 10,
    interest_rate_pct: 4.0,
    women_rebate_pct: 0.5,
    max_tenure_years: 10,
    moratorium_months: 12,
    description: {
      en: 'Concessional education loans covering tuition and related costs for SC students in recognized courses, India or abroad.',
      hi: 'मान्यता प्राप्त पाठ्यक्रमों हेतु अनुसूचित जाति के छात्रों के लिए रियायती शिक्षा ऋण।',
      gu: 'માન્યતા પ્રાપ્ત અભ્યાસક્રમો માટે SC વિદ્યાર્થીઓ માટે રાહત દરે શિક્ષણ ધિરાણ.',
    },
  },
];

// ─── Mock Channel Partner Data ────────────────────────────────
const partners = [
  {
    partner_id: 'cp_sca_01',
    name: 'Gujarat SC Development Corporation (SCA)',
    partner_type: 'SCA',
    address: 'Collectorate Compound, Ashram Road, Ahmedabad',
    pincode: '380009',
    latitude: 23.0225,
    longitude: 72.5714,
    npa_rate: 3.4,
    fund_status: 'available',
    supported_schemes: ['mcf_01', 'term_01', 'edu_01'],
    contact_phone: '+91 79 2754 0000',
  },
  {
    partner_id: 'cp_psb_01',
    name: 'State Bank of India - Navrangpura Branch',
    partner_type: 'PSB',
    address: 'Sardar Patel Marg, Navrangpura, Ahmedabad',
    pincode: '380009',
    latitude: 23.0339,
    longitude: 72.5622,
    npa_rate: 5.1,
    fund_status: 'available',
    supported_schemes: ['mcf_01', 'term_01'],
    contact_phone: '+91 79 2646 1122',
  },
  {
    partner_id: 'cp_rrb_01',
    name: 'Baroda Gujarat Gramin Bank - Maninagar Branch',
    partner_type: 'RRB',
    address: 'Rambaug Road, Maninagar, Ahmedabad',
    pincode: '380008',
    latitude: 22.9968,
    longitude: 72.6031,
    npa_rate: 6.8,
    fund_status: 'available',
    supported_schemes: ['mcf_01', 'edu_01'],
    contact_phone: '+91 79 2546 3300',
  },
  {
    partner_id: 'cp_mfi_01',
    name: 'Ujjivan Small Finance (NBFC-MFI) - Vastrapur',
    partner_type: 'NBFC_MFI',
    address: 'Vastrapur Lake Road, Ahmedabad',
    pincode: '380015',
    latitude: 23.0367,
    longitude: 72.5297,
    npa_rate: 8.2,
    fund_status: 'exhausted',
    supported_schemes: ['mcf_01'],
    contact_phone: '+91 79 4011 5566',
  },
  {
    partner_id: 'cp_psb_02',
    name: 'Bank of Baroda - CG Road Branch',
    partner_type: 'PSB',
    address: 'C G Road, Ellisbridge, Ahmedabad',
    pincode: '380006',
    latitude: 23.0258,
    longitude: 72.5626,
    npa_rate: 4.6,
    fund_status: 'available',
    supported_schemes: ['term_01', 'edu_01'],
    contact_phone: '+91 79 2640 7788',
  },
  {
    partner_id: 'cp_sca_02',
    name: 'Ahmedabad District SC Corporation Office',
    partner_type: 'SCA',
    address: 'Nr. Income Tax Circle, Ashram Road, Ahmedabad',
    pincode: '380014',
    latitude: 23.028,
    longitude: 72.565,
    npa_rate: 2.9,
    fund_status: 'available',
    supported_schemes: ['mcf_01', 'term_01', 'edu_01'],
    contact_phone: '+91 79 2754 2200',
  },
];

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
