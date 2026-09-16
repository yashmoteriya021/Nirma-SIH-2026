import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemesPath = path.resolve(__dirname, '../frontend/src/data/schemes.json');
const partnersPath = path.resolve(__dirname, '../frontend/src/data/partners.json');

const schemesData = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));
const partnersData = JSON.parse(fs.readFileSync(partnersPath, 'utf8'));

// 20 New Schemes
const categories = ["Micro Finance", "Education", "Business", "Green Energy", "Agriculture", "Healthcare", "Tech Startup"];
const newSchemes = Array.from({ length: 20 }).map((_, i) => {
  const cat = categories[i % categories.length];
  return {
    id: `new-scheme-${Date.now()}-${i}`,
    name: {
      en: `${cat} Expansion Scheme ${i + 1}`,
      hi: `${cat} विस्तार योजना ${i + 1}`
    },
    category: {
      en: cat,
      hi: cat
    },
    description: {
      en: `A new comprehensive financial support scheme for ${cat.toLowerCase()} initiatives across the country.`,
      hi: `देश भर में ${cat} पहलों के लिए एक नई व्यापक वित्तीय सहायता योजना।`
    },
    maxAmount: 500000 + (i * 50000),
    interestRate: { min: 4 + (i % 3), max: 7 + (i % 2) },
    fundingPercent: 80 + (i % 20),
    moratoriumMonths: [3, 6, 12],
    tenureMonths: 60 + (i % 24),
    incomeLimit: 600000,
    eligibility: {
      en: ["SC Category", "Valid Business/Student ID"],
      hi: ["SC श्रेणी", "वैध व्यवसाय/छात्र आईडी"]
    },
    documents: {
      en: ["SC Certificate", "Aadhaar", "Income Proof"],
      hi: ["जाति प्रमाण पत्र", "आधार", "आय प्रमाण"]
    },
    applicationProcess: {
      en: ["Apply Online", "Bank Verification", "Approval"],
      hi: ["ऑनलाइन आवेदन करें", "बैंक सत्यापन", "स्वीकृति"]
    },
    faqs: {
      en: [{ q: "What is the max amount?", a: `Up to ${5 + i * 0.5} Lakhs.` }],
      hi: [{ q: "अधिकतम राशि क्या है?", a: `${5 + i * 0.5} लाख तक।` }]
    }
  };
});

// 20 New Partners (All over India)
const cities = [
  { city: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
  { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 }
];

const newPartners = Array.from({ length: 20 }).map((_, i) => {
  const loc = cities[i % cities.length];
  // Slightly randomize coordinates so they don't overlap exactly
  const latOffset = (Math.random() - 0.5) * 0.1;
  const lngOffset = (Math.random() - 0.5) * 0.1;
  return {
    id: `new-cp-${Date.now()}-${i}`,
    name: {
      en: `National Bank Branch ${i + 1}`,
      hi: `राष्ट्रीय बैंक शाखा ${i + 1}`
    },
    type: i % 2 === 0 ? "PSB" : "RRB",
    city: {
      en: loc.city,
      hi: loc.city
    },
    state: {
      en: loc.state,
      hi: loc.state
    },
    address: {
      en: `Main Road, ${loc.city}, ${loc.state}`,
      hi: `मुख्य सड़क, ${loc.city}, ${loc.state}`
    },
    lat: loc.lat + latOffset,
    lng: loc.lng + lngOffset,
    phone: `+91 98000${10000 + i}`,
    status: "accepting",
    schemesSupported: [
      schemesData.schemes[0].id,
      newSchemes[i].id
    ]
  };
});

schemesData.schemes.push(...newSchemes);
partnersData.partners.push(...newPartners);

fs.writeFileSync(schemesPath, JSON.stringify(schemesData, null, 2));
fs.writeFileSync(partnersPath, JSON.stringify(partnersData, null, 2));

console.log(`Added ${newSchemes.length} new schemes. Total: ${schemesData.schemes.length}`);
console.log(`Added ${newPartners.length} new partners. Total: ${partnersData.partners.length}`);
