import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const partnersPath = path.join(__dirname, 'partners.json');
let data = { partners: [] };

if (fs.existsSync(partnersPath)) {
  data = JSON.parse(fs.readFileSync(partnersPath, 'utf8'));
}

// Keep only original 6 if this script runs multiple times
if (data.partners.length > 6) {
  data.partners = data.partners.slice(0, 6);
}

const allSchemeIds = [
  "micro-finance", "term-loan", "education-loan", "mahila-samridhi", "agriculture-loan",
  "tech-startup", "vocational-training", "green-energy", "healthcare-startup", "transport-loan",
  "shilpi-samridhi", "poultry-farming", "overseas-education", "franchise-business", "skill-upgrade",
  "sports-excellence", "street-vendor", "divyangjan-sashaktikaran", "civil-service-coaching", "export-promotion",
  "legal-advocacy", "organic-farming", "clean-water", "home-renovation", "ecommerce-startup",
  // The 15 new ones
  "food-processing", "beauty-wellness", "handicraft-export", "electric-vehicle", "solar-installation",
  "cloud-kitchen", "apparel-manufacturing", "it-services", "tourism-agency", "waste-management",
  "construction-equipment", "mobile-repair", "organic-store", "fitness-center", "dairy-processing"
];

function getRandomSchemes(count) {
  const shuffled = [...allSchemeIds].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const newPartners = [
  { id: "p7", name: { en: "Bank of Baroda - SC Cell", hi: "बैंक ऑफ बड़ौदा - SC सेल" }, type: "Public Sector Bank", city: { en: "Ahmedabad", hi: "अहमदाबाद" }, state: { en: "Gujarat", hi: "गुजरात" }, address: { en: "Ashram Road, Ahmedabad", hi: "आश्रम रोड, अहमदाबाद" }, lat: 23.0225, lng: 72.5714, phone: "+91-79-1111-XXXX", status: "accepting" },
  { id: "p8", name: { en: "HDFC Microfinance", hi: "HDFC माइक्रोफाइनेंस" }, type: "Private Bank", city: { en: "Pune", hi: "पुणे" }, state: { en: "Maharashtra", hi: "महाराष्ट्र" }, address: { en: "FC Road, Pune", hi: "एफसी रोड, पुणे" }, lat: 18.5204, lng: 73.8567, phone: "+91-20-2222-XXXX", status: "accepting" },
  { id: "p9", name: { en: "Ujjivan Small Finance Bank", hi: "उज्जीवन स्मॉल फाइनेंस बैंक" }, type: "Small Finance Bank", city: { en: "Bangalore", hi: "बेंगलुरु" }, state: { en: "Karnataka", hi: "कर्नाटक" }, address: { en: "Koramangala, Bangalore", hi: "कोरमंगला, बेंगलुरु" }, lat: 12.9716, lng: 77.5946, phone: "+91-80-3333-XXXX", status: "accepting" },
  { id: "p10", name: { en: "Canara Bank", hi: "केनरा बैंक" }, type: "Public Sector Bank", city: { en: "Chennai", hi: "चेन्नई" }, state: { en: "Tamil Nadu", hi: "तमिलनाडु" }, address: { en: "Mount Road, Chennai", hi: "माउंट रोड, चेन्नई" }, lat: 13.0827, lng: 80.2707, phone: "+91-44-4444-XXXX", status: "accepting" },
  { id: "p11", name: { en: "Kerala State SC/ST Dev Corp", hi: "केरल राज्य SC/ST विकास निगम" }, type: "SCA", city: { en: "Trivandrum", hi: "त्रिवेंद्रम" }, state: { en: "Kerala", hi: "केरल" }, address: { en: "Palayam, Trivandrum", hi: "पालयम, त्रिवेंद्रम" }, lat: 8.5241, lng: 76.9366, phone: "+91-471-5555-XXXX", status: "accepting" },
  { id: "p12", name: { en: "Rajasthan SC Finance Corp", hi: "राजस्थान SC वित्त निगम" }, type: "SCA", city: { en: "Jaipur", hi: "जयपुर" }, state: { en: "Rajasthan", hi: "राजस्थान" }, address: { en: "C-Scheme, Jaipur", hi: "सी-स्कीम, जयपुर" }, lat: 26.9124, lng: 75.7873, phone: "+91-141-6666-XXXX", status: "paused" },
  { id: "p13", name: { en: "Axis Bank - Priority Sector", hi: "एक्सिस बैंक - प्राथमिकता क्षेत्र" }, type: "Private Bank", city: { en: "Delhi", hi: "दिल्ली" }, state: { en: "Delhi", hi: "दिल्ली" }, address: { en: "Karol Bagh, Delhi", hi: "करोल बाग, दिल्ली" }, lat: 28.6139, lng: 77.2090, phone: "+91-11-7777-XXXX", status: "accepting" },
  { id: "p14", name: { en: "Muthoot Microfin", hi: "मुथूट माइक्रोफिन" }, type: "NBFC-MFI", city: { en: "Kochi", hi: "कोच्चि" }, state: { en: "Kerala", hi: "केरल" }, address: { en: "MG Road, Kochi", hi: "एमजी रोड, कोच्चि" }, lat: 9.9312, lng: 76.2673, phone: "+91-484-8888-XXXX", status: "accepting" },
  { id: "p15", name: { en: "ICICI Bank - Rural", hi: "ICICI बैंक - ग्रामीण" }, type: "Private Bank", city: { en: "Hyderabad", hi: "हैदराबाद" }, state: { en: "Telangana", hi: "तेलंगाना" }, address: { en: "Banjara Hills, Hyderabad", hi: "बंजारा हिल्स, हैदराबाद" }, lat: 17.3850, lng: 78.4867, phone: "+91-40-9999-XXXX", status: "accepting" },
  { id: "p16", name: { en: "Madhya Pradesh SC Co-op", hi: "मध्य प्रदेश SC को-ऑप" }, type: "SCA", city: { en: "Bhopal", hi: "भोपाल" }, state: { en: "Madhya Pradesh", hi: "मध्य प्रदेश" }, address: { en: "MP Nagar, Bhopal", hi: "एमपी नगर, भोपाल" }, lat: 23.2599, lng: 77.4126, phone: "+91-755-1010-XXXX", status: "accepting" },
  { id: "p17", name: { en: "Odisha SC/ST Dev Corp", hi: "ओडिशा SC/ST विकास निगम" }, type: "SCA", city: { en: "Bhubaneswar", hi: "भुवनेश्वर" }, state: { en: "Odisha", hi: "ओडिशा" }, address: { en: "Saheed Nagar, Bhubaneswar", hi: "शहीद नगर, भुवनेश्वर" }, lat: 20.2961, lng: 85.8245, phone: "+91-674-1111-XXXX", status: "accepting" },
  { id: "p18", name: { en: "SKS Microfinance", hi: "SKS माइक्रोफाइनेंस" }, type: "NBFC-MFI", city: { en: "Patna", hi: "पटना" }, state: { en: "Bihar", hi: "बिहार" }, address: { en: "Frazer Road, Patna", hi: "फ्रेज़र रोड, पटना" }, lat: 25.5941, lng: 85.1376, phone: "+91-612-1212-XXXX", status: "accepting" },
  { id: "p19", name: { en: "Union Bank of India", hi: "यूनियन बैंक ऑफ इंडिया" }, type: "Public Sector Bank", city: { en: "Kolkata", hi: "कोलकाता" }, state: { en: "West Bengal", hi: "पश्चिम बंगाल" }, address: { en: "Park Street, Kolkata", hi: "पार्क स्ट्रीट, कोलकाता" }, lat: 22.5726, lng: 88.3639, phone: "+91-33-1313-XXXX", status: "paused" },
  { id: "p20", name: { en: "Punjab & Sind Bank", hi: "पंजाब एंड सिंध बैंक" }, type: "Public Sector Bank", city: { en: "Chandigarh", hi: "चंडीगढ़" }, state: { en: "Punjab", hi: "पंजाब" }, address: { en: "Sector 17, Chandigarh", hi: "सेक्टर 17, चंडीगढ़" }, lat: 30.7333, lng: 76.7794, phone: "+91-172-1414-XXXX", status: "accepting" },
  { id: "p21", name: { en: "Mahatma Phule Corp", hi: "महात्मा फुले निगम" }, type: "SCA", city: { en: "Nagpur", hi: "नागपुर" }, state: { en: "Maharashtra", hi: "महाराष्ट्र" }, address: { en: "Sitabuldi, Nagpur", hi: "सीताबर्डी, नागपुर" }, lat: 21.1458, lng: 79.0882, phone: "+91-712-1515-XXXX", status: "accepting" },
  { id: "p22", name: { en: "Equitas Small Finance Bank", hi: "इक्विटास स्मॉल फाइनेंस बैंक" }, type: "Small Finance Bank", city: { en: "Coimbatore", hi: "कोयंबटूर" }, state: { en: "Tamil Nadu", hi: "तमिलनाडु" }, address: { en: "RS Puram, Coimbatore", hi: "आरएस पुरम, कोयंबटूर" }, lat: 11.0168, lng: 76.9558, phone: "+91-422-1616-XXXX", status: "accepting" },
  { id: "p23", name: { en: "Assam SC Development Corp", hi: "असम SC विकास निगम" }, type: "SCA", city: { en: "Guwahati", hi: "गुवाहाटी" }, state: { en: "Assam", hi: "असम" }, address: { en: "Ganeshguri, Guwahati", hi: "गणेशगुरी, गुवाहाटी" }, lat: 26.1445, lng: 91.7362, phone: "+91-361-1717-XXXX", status: "accepting" },
  { id: "p24", name: { en: "Spandana Sphoorty", hi: "स्पंदना स्फूर्ति" }, type: "NBFC-MFI", city: { en: "Indore", hi: "इंदौर" }, state: { en: "Madhya Pradesh", hi: "मध्य प्रदेश" }, address: { en: "Palasia, Indore", hi: "पलासिया, इंदौर" }, lat: 22.7196, lng: 75.8577, phone: "+91-731-1818-XXXX", status: "accepting" },
  { id: "p25", name: { en: "Chhattisgarh State SC Corp", hi: "छत्तीसगढ़ राज्य SC निगम" }, type: "SCA", city: { en: "Raipur", hi: "रायपुर" }, state: { en: "Chhattisgarh", hi: "छत्तीसगढ़" }, address: { en: "Civil Lines, Raipur", hi: "सिविल लाइंस, रायपुर" }, lat: 21.2514, lng: 81.6296, phone: "+91-771-1919-XXXX", status: "paused" },
  { id: "p26", name: { en: "Indian Bank", hi: "इंडियन बैंक" }, type: "Public Sector Bank", city: { en: "Lucknow", hi: "लखनऊ" }, state: { en: "Uttar Pradesh", hi: "उत्तर प्रदेश" }, address: { en: "Hazratganj, Lucknow", hi: "हजरतगंज, लखनऊ" }, lat: 26.8467, lng: 80.9462, phone: "+91-522-2020-XXXX", status: "accepting" },
  { id: "p27", name: { en: "State Bank of India - SC/ST Branch", hi: "भारतीय स्टेट बैंक - SC/ST शाखा" }, type: "Public Sector Bank", city: { en: "Agra", hi: "आगरा" }, state: { en: "Uttar Pradesh", hi: "उत्तर प्रदेश" }, address: { en: "Sanjay Place, Agra", hi: "संजय प्लेस, आगरा" }, lat: 27.1767, lng: 78.0081, phone: "+91-562-2121-XXXX", status: "accepting" },
  { id: "p28", name: { en: "Mudra Microfinance", hi: "मुद्रा माइक्रोफाइनेंस" }, type: "NBFC-MFI", city: { en: "Surat", hi: "सूरत" }, state: { en: "Gujarat", hi: "गुजरात" }, address: { en: "Ring Road, Surat", hi: "रिंग रोड, सूरत" }, lat: 21.1702, lng: 72.8311, phone: "+91-261-2222-XXXX", status: "accepting" },
  { id: "p29", name: { en: "Jharkhand SC Co-op Society", hi: "झारखंड SC को-ऑप सोसाइटी" }, type: "SCA", city: { en: "Ranchi", hi: "रांची" }, state: { en: "Jharkhand", hi: "झारखंड" }, address: { en: "Main Road, Ranchi", hi: "मेन रोड, रांची" }, lat: 23.3441, lng: 85.3096, phone: "+91-651-2323-XXXX", status: "accepting" },
  { id: "p30", name: { en: "Telangana SC Finance Corp", hi: "तेलंगाना SC वित्त निगम" }, type: "SCA", city: { en: "Hyderabad", hi: "हैदराबाद" }, state: { en: "Telangana", hi: "तेलंगाना" }, address: { en: "Masab Tank, Hyderabad", hi: "मासाब टैंक, हैदराबाद" }, lat: 17.4047, lng: 78.4504, phone: "+91-40-2424-XXXX", status: "accepting" },
  { id: "p31", name: { en: "Bank of India", hi: "बैंक ऑफ इंडिया" }, type: "Public Sector Bank", city: { en: "Bhopal", hi: "भोपाल" }, state: { en: "Madhya Pradesh", hi: "मध्य प्रदेश" }, address: { en: "Arera Colony, Bhopal", hi: "अरेरा कॉलोनी, भोपाल" }, lat: 23.2167, lng: 77.4333, phone: "+91-755-2525-XXXX", status: "accepting" },
  { id: "p32", name: { en: "Central Bank of India", hi: "सेंट्रल बैंक ऑफ इंडिया" }, type: "Public Sector Bank", city: { en: "Kanpur", hi: "कानपुर" }, state: { en: "Uttar Pradesh", hi: "उत्तर प्रदेश" }, address: { en: "Mall Road, Kanpur", hi: "मॉल रोड, कानपुर" }, lat: 26.4499, lng: 80.3319, phone: "+91-512-2626-XXXX", status: "accepting" },
  { id: "p33", name: { en: "Arohan Financial Services", hi: "आरोहण वित्तीय सेवाएं" }, type: "NBFC-MFI", city: { en: "Guwahati", hi: "गुवाहाटी" }, state: { en: "Assam", hi: "असम" }, address: { en: "Paltan Bazaar, Guwahati", hi: "पल्टन बाज़ार, गुवाहाटी" }, lat: 26.1806, lng: 91.7538, phone: "+91-361-2727-XXXX", status: "accepting" },
  { id: "p34", name: { en: "Belstar Microfinance", hi: "बेलस्टार माइक्रोफाइनेंस" }, type: "NBFC-MFI", city: { en: "Chennai", hi: "चेन्नई" }, state: { en: "Tamil Nadu", hi: "तमिलनाडु" }, address: { en: "T Nagar, Chennai", hi: "टी नगर, चेन्नई" }, lat: 13.0418, lng: 80.2341, phone: "+91-44-2828-XXXX", status: "accepting" },
  { id: "p35", name: { en: "Punjab National Bank - MSME", hi: "पंजाब नेशनल बैंक - MSME" }, type: "Public Sector Bank", city: { en: "Ludhiana", hi: "लुधियाना" }, state: { en: "Punjab", hi: "पंजाब" }, address: { en: "Ferozepur Road, Ludhiana", hi: "फिरोजपुर रोड, लुधियाना" }, lat: 30.9010, lng: 75.8523, phone: "+91-161-2929-XXXX", status: "accepting" }
].map(p => ({
  ...p,
  schemesSupported: getRandomSchemes(Math.floor(Math.random() * 8) + 6) // Each supports 6 to 13 random schemes
}));

data.partners.push(...newPartners);

fs.writeFileSync(partnersPath, JSON.stringify(data, null, 2));
console.log('Added 29 new partners to partners.json. Total is 35.');
