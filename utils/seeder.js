const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');
const Prescription = require('../models/Prescription');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const localDb = require('./localDb');

dotenv.config();

const DATA_DIR = path.join(__dirname, '..', 'data');

// 10 Verified Pharmacies Across Major Bengaluru Zones
const PHARMACIES = [
  {
    name: 'Rajesh Sharma',
    email: 'apollo.indiranagar@medifind.com',
    shopName: 'Apollo Pharmacy Indiranagar',
    phone: '9845012340',
    address: '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    latitude: 12.9719,
    longitude: 77.6412,
    license: 'KA-BEN-102938',
    openingHours: '24 Hours Open',
    rating: 4.9,
    reviewCount: 48
  },
  {
    name: 'Suresh Kumar',
    email: 'medplus.koramangala@medifind.com',
    shopName: 'MedPlus Koramangala 5th Block',
    phone: '9845023451',
    address: '80ft Road, 5th Block, Koramangala, Bengaluru, Karnataka 560095',
    latitude: 12.9352,
    longitude: 77.6245,
    license: 'KA-BEN-204859',
    openingHours: '7:00 AM - 11:30 PM',
    rating: 4.7,
    reviewCount: 42
  },
  {
    name: 'Pooja Hegde',
    email: 'wellness.jayanagar@medifind.com',
    shopName: 'Wellness Forever Jayanagar 4th Block',
    phone: '9845034562',
    address: '11th Main Rd, 4th Block, Jayanagar, Bengaluru, Karnataka 560011',
    latitude: 12.9298,
    longitude: 77.5840,
    license: 'KA-BEN-394820',
    openingHours: '24 Hours Open',
    rating: 4.8,
    reviewCount: 39
  },
  {
    name: 'Manoj Patel',
    email: 'trustchem.mgroad@medifind.com',
    shopName: 'TrustChem Central MG Road',
    phone: '9845045673',
    address: 'MG Road, Ashok Nagar, Bengaluru, Karnataka 560001',
    latitude: 12.9756,
    longitude: 77.6095,
    license: 'KA-BEN-493821',
    openingHours: '8:00 AM - 11:00 PM',
    rating: 4.6,
    reviewCount: 31
  },
  {
    name: 'Anand Varma',
    email: 'lifecare.hsr@medifind.com',
    shopName: 'LifeCare Chemists HSR Layout',
    phone: '9845056784',
    address: '27th Main Rd, Sector 1, HSR Layout, Bengaluru, Karnataka 560102',
    latitude: 12.9121,
    longitude: 77.6446,
    license: 'KA-BEN-584729',
    openingHours: '8:00 AM - 10:30 PM',
    rating: 4.8,
    reviewCount: 45
  },
  {
    name: 'Kavita Nair',
    email: 'careplus.whitefield@medifind.com',
    shopName: 'CarePlus Pharmacy Whitefield Main',
    phone: '9845067895',
    address: 'ITPB Main Rd, Whitefield, Bengaluru, Karnataka 560066',
    latitude: 12.9698,
    longitude: 77.7499,
    license: 'KA-BEN-694821',
    openingHours: '7:30 AM - 11:00 PM',
    rating: 4.7,
    reviewCount: 36
  },
  {
    name: 'Ramesh Shenoy',
    email: 'malleshwaram.chemists@medifind.com',
    shopName: 'Malleshwaram Drug Center 8th Cross',
    phone: '9845078901',
    address: 'Sampige Road, Malleshwaram, Bengaluru, Karnataka 560003',
    latitude: 13.0031,
    longitude: 77.5702,
    license: 'KA-BEN-718293',
    openingHours: '8:00 AM - 10:00 PM',
    rating: 4.6,
    reviewCount: 28
  },
  {
    name: 'Sunita Joshi',
    email: 'rajajinagar.health@medifind.com',
    shopName: 'Rajajinagar Health Hub Pharmacy',
    phone: '9845089012',
    address: 'Dr. Rajkumar Road, Rajajinagar, Bengaluru, Karnataka 560010',
    latitude: 12.9982,
    longitude: 77.5530,
    license: 'KA-BEN-829301',
    openingHours: '24 Hours Open',
    rating: 4.8,
    reviewCount: 33
  },
  {
    name: 'Deepak Reddy',
    email: 'ecity.pharma@medifind.com',
    shopName: 'Electronic City Express Pharmacy',
    phone: '9845090123',
    address: 'Neeladri Road, Phase 1, Electronic City, Bengaluru, Karnataka 560100',
    latitude: 12.8452,
    longitude: 77.6602,
    license: 'KA-BEN-930192',
    openingHours: '7:00 AM - Midnight',
    rating: 4.7,
    reviewCount: 29
  },
  {
    name: 'Meera Deshmukh',
    email: 'marathahalli.meds@medifind.com',
    shopName: 'Marathahalli Bridge Chemist & Care',
    phone: '9845001234',
    address: 'Varthur Rd, Marathahalli, Bengaluru, Karnataka 560037',
    latitude: 12.9569,
    longitude: 77.7011,
    license: 'KA-BEN-019283',
    openingHours: '24 Hours Open',
    rating: 4.9,
    reviewCount: 52
  }
];

// 20 Realistic Registered Customers
const CUSTOMERS = [
  { name: 'Aditya Verma', email: 'aditya.verma@example.com', phone: '9876543210', address: 'Indiranagar 12th Main, Bengaluru' },
  { name: 'Priya Sundaram', email: 'priya.sundaram@example.com', phone: '9876543211', address: 'Koramangala 4th Block, Bengaluru' },
  { name: 'Rohan Deshmukh', email: 'rohan.deshmukh@example.com', phone: '9876543212', address: 'HSR Layout Sector 2, Bengaluru' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@example.com', phone: '9876543213', address: 'Jayanagar 9th Block, Bengaluru' },
  { name: 'Vikram Malhotra', email: 'vikram.malhotra@example.com', phone: '9876543214', address: 'Whitefield ECC Road, Bengaluru' },
  { name: 'Sneha Kulkarni', email: 'sneha.kulkarni@example.com', phone: '9876543215', address: 'Malleshwaram 15th Cross, Bengaluru' },
  { name: 'Arjun Nair', email: 'arjun.nair@example.com', phone: '9876543216', address: 'MG Road Trinity Circle, Bengaluru' },
  { name: 'Divya Menon', email: 'divya.menon@example.com', phone: '9876543217', address: 'Marathahalli Outer Ring Rd, Bengaluru' },
  { name: 'Karthik Rao', email: 'karthik.rao@example.com', phone: '9876543218', address: 'Electronic City Phase 1, Bengaluru' },
  { name: 'Neha Bhatt', email: 'neha.bhatt@example.com', phone: '9876543219', address: 'Rajajinagar 1st Block, Bengaluru' },
  { name: 'Sanjay Gupta', email: 'sanjay.gupta@example.com', phone: '9876543220', address: 'Indiranagar 100ft Rd, Bengaluru' },
  { name: 'Ritu Banerjee', email: 'ritu.banerjee@example.com', phone: '9876543221', address: 'Koramangala 7th Block, Bengaluru' },
  { name: 'Manish Tiwari', email: 'manish.tiwari@example.com', phone: '9876543222', address: 'HSR Layout 5th Main, Bengaluru' },
  { name: 'Pooja Agarwal', email: 'pooja.agarwal@example.com', phone: '9876543223', address: 'Jayanagar 3rd Block, Bengaluru' },
  { name: 'Rahul Joshi', email: 'rahul.joshi@example.com', phone: '9876543224', address: 'Whitefield Palm Meadows, Bengaluru' },
  { name: 'Tanvi Shinde', email: 'tanvi.shinde@example.com', phone: '9876543225', address: 'Malleshwaram Margosa Rd, Bengaluru' },
  { name: 'Gaurav Sen', email: 'gaurav.sen@example.com', phone: '9876543226', address: 'Brigade Road, Bengaluru' },
  { name: 'Swati Pillai', email: 'swati.pillai@example.com', phone: '9876543227', address: 'Bellandur Green Glen, Bengaluru' },
  { name: 'Akash Reddy', email: 'akash.reddy@example.com', phone: '9876543228', address: 'Electronic City Doddathogur, Bengaluru' },
  { name: 'Megha Kapoor', email: 'megha.kapoor@example.com', phone: '9876543229', address: 'Rajajinagar West of Chord Rd, Bengaluru' }
];

// 40+ Core Medicine Templates across all Therapeutic Categories
const MEDICINE_TEMPLATES = [
  // Analgesics & Antipyretics
  { name: 'Dolo 650 Tablet', genericName: 'Paracetamol', strength: '650mg', dosageForm: 'Tablet', category: 'Analgesic', manufacturer: 'Micro Labs Ltd', brand: 'Dolo', price: 33.50, discount: 5, stock: 120, prescriptionRequired: false },
  { name: 'Crocin 650 Advance', genericName: 'Paracetamol', strength: '650mg', dosageForm: 'Tablet', category: 'Analgesic', manufacturer: 'GSK Consumer', brand: 'Crocin', price: 32.00, discount: 0, stock: 80, prescriptionRequired: false },
  { name: 'Calpol 500mg Tablet', genericName: 'Paracetamol', strength: '500mg', dosageForm: 'Tablet', category: 'Analgesic', manufacturer: 'GSK Pharma', brand: 'Calpol', price: 21.00, discount: 0, stock: 65, prescriptionRequired: false },
  { name: 'Combiflam Tablet', genericName: 'Ibuprofen + Paracetamol', strength: '400mg/325mg', dosageForm: 'Tablet', category: 'Analgesic', manufacturer: 'Sanofi India', brand: 'Combiflam', price: 45.00, discount: 10, stock: 90, prescriptionRequired: false },
  { name: 'Meftal-Spas Tablet', genericName: 'Mefenamic Acid + Dicyclomine', strength: '250mg/10mg', dosageForm: 'Tablet', category: 'Analgesic', manufacturer: 'Blue Cross Labs', brand: 'Meftal', price: 52.00, discount: 5, stock: 45, prescriptionRequired: false },
  { name: 'Saridon Headache Relief', genericName: 'Propyphenazone + Paracetamol + Caffeine', strength: 'Triple Action', dosageForm: 'Tablet', category: 'Analgesic', manufacturer: 'Piramal Healthcare', brand: 'Saridon', price: 42.00, discount: 0, stock: 100, prescriptionRequired: false },
  { name: 'Volini Pain Relief Gel', genericName: 'Diclofenac Diethylamine + Methyl Salicylate', strength: '50g Tube', dosageForm: 'Gel', category: 'Analgesic', manufacturer: 'Sun Pharma', brand: 'Volini', price: 160.00, discount: 8, stock: 65, prescriptionRequired: false },
  { name: 'Zerodol-SP Tablet', genericName: 'Aceclofenac + Paracetamol + Serratiopeptidase', strength: '100mg/325mg/15mg', dosageForm: 'Tablet', category: 'Analgesic', manufacturer: 'Ipca Laboratories', brand: 'Zerodol', price: 125.00, discount: 10, stock: 55, prescriptionRequired: true },

  // Gastrointestinal & Antacids
  { name: 'Pantocid 40mg Tablet', genericName: 'Pantoprazole', strength: '40mg', dosageForm: 'Tablet', category: 'Gastrointestinal', manufacturer: 'Sun Pharma', brand: 'Pantocid', price: 155.00, discount: 12, stock: 50, prescriptionRequired: false },
  { name: 'Pan-D Capsule', genericName: 'Pantoprazole + Domperidone', strength: '40mg/30mg', dosageForm: 'Capsule', category: 'Gastrointestinal', manufacturer: 'Alkem Labs', brand: 'Pan', price: 198.00, discount: 15, stock: 40, prescriptionRequired: false },
  { name: 'Omez 20mg Capsule', genericName: 'Omeprazole', strength: '20mg', dosageForm: 'Capsule', category: 'Gastrointestinal', manufacturer: "Dr. Reddy's Labs", brand: 'Omez', price: 62.50, discount: 8, stock: 75, prescriptionRequired: false },
  { name: 'Gelusil MPS Liquid', genericName: 'Aluminium Hydroxide + Dimethicone', strength: '200ml', dosageForm: 'Syrup', category: 'Gastrointestinal', manufacturer: 'Pfizer Ltd', brand: 'Gelusil', price: 125.00, discount: 5, stock: 35, prescriptionRequired: false },
  { name: 'Digene Mint Fizz Powder', genericName: 'Magnesium Hydroxide Antacid', strength: '5g Sachet', dosageForm: 'Powder', category: 'Gastrointestinal', manufacturer: 'Abbott Healthcare', brand: 'Digene', price: 12.00, discount: 0, stock: 150, prescriptionRequired: false },
  { name: 'Eno Fruit Salt Regular', genericName: 'Sodium Bicarbonate + Citric Acid', strength: '100g Bottle', dosageForm: 'Powder', category: 'Gastrointestinal', manufacturer: 'GSK Consumer', brand: 'Eno', price: 140.00, discount: 5, stock: 60, prescriptionRequired: false },
  { name: 'Razo 20mg Tablet', genericName: 'Rabeprazole', strength: '20mg', dosageForm: 'Tablet', category: 'Gastrointestinal', manufacturer: "Dr. Reddy's Labs", brand: 'Razo', price: 180.00, discount: 10, stock: 45, prescriptionRequired: false },
  { name: 'Cremaffin Plus Syrup', genericName: 'Liquid Paraffin + Milk of Magnesia', strength: '225ml', dosageForm: 'Syrup', category: 'Gastrointestinal', manufacturer: 'Abbott India', brand: 'Cremaffin', price: 260.00, discount: 8, stock: 30, prescriptionRequired: false },

  // Respiratory & Anti-Allergics
  { name: 'Cetzine 10mg Tablet', genericName: 'Cetirizine', strength: '10mg', dosageForm: 'Tablet', category: 'Respiratory', manufacturer: 'GSK Consumer', brand: 'Cetzine', price: 24.00, discount: 5, stock: 110, prescriptionRequired: false },
  { name: 'Allegra 120mg Tablet', genericName: 'Fexofenadine', strength: '120mg', dosageForm: 'Tablet', category: 'Respiratory', manufacturer: 'Sanofi India', brand: 'Allegra', price: 215.00, discount: 10, stock: 30, prescriptionRequired: false },
  { name: 'Ascoril D Plus Syrup', genericName: 'Dextromethorphan + Phenylephrine', strength: '100ml', dosageForm: 'Syrup', category: 'Respiratory', manufacturer: 'Glenmark Pharma', brand: 'Ascoril', price: 135.00, discount: 8, stock: 45, prescriptionRequired: false },
  { name: 'Montair-LC Tablet', genericName: 'Montelukast + Levocetirizine', strength: '10mg/5mg', dosageForm: 'Tablet', category: 'Respiratory', manufacturer: 'Cipla Ltd', brand: 'Montair', price: 185.00, discount: 12, stock: 60, prescriptionRequired: false },
  { name: 'Benadryl Cough Formula', genericName: 'Diphenhydramine + Ammonium Chloride', strength: '150ml', dosageForm: 'Syrup', category: 'Respiratory', manufacturer: 'Johnson & Johnson', brand: 'Benadryl', price: 145.00, discount: 5, stock: 55, prescriptionRequired: false },
  { name: 'Otrivin Oxy Fast Relief', genericName: 'Oxymetazoline HCl 0.05%', strength: '10ml Spray', dosageForm: 'Drops', category: 'Respiratory', manufacturer: 'GSK Consumer', brand: 'Otrivin', price: 95.00, discount: 0, stock: 70, prescriptionRequired: false },
  { name: 'Asthalin 100mcg Inhaler', genericName: 'Salbutamol', strength: '100mcg (200 MD)', dosageForm: 'Inhaler', category: 'Respiratory', manufacturer: 'Cipla Ltd', brand: 'Asthalin', price: 175.00, discount: 5, stock: 35, prescriptionRequired: true },
  { name: 'Budecort 200 Inhaler', genericName: 'Budesonide', strength: '200mcg', dosageForm: 'Inhaler', category: 'Respiratory', manufacturer: 'Cipla Ltd', brand: 'Budecort', price: 340.00, discount: 10, stock: 25, prescriptionRequired: true },

  // Antibiotics (Rx Required)
  { name: 'Augmentin 625 Duo Tablet', genericName: 'Amoxicillin + Clavulanic Acid', strength: '500mg/125mg', dosageForm: 'Tablet', category: 'Antibiotics', manufacturer: 'GSK Pharma', brand: 'Augmentin', price: 205.00, discount: 10, stock: 40, prescriptionRequired: true },
  { name: 'Azithral 500mg Tablet', genericName: 'Azithromycin', strength: '500mg', dosageForm: 'Tablet', category: 'Antibiotics', manufacturer: 'Alembic Pharma', brand: 'Azithral', price: 128.00, discount: 8, stock: 55, prescriptionRequired: true },
  { name: 'Taxim-O 200mg Tablet', genericName: 'Cefixime', strength: '200mg', dosageForm: 'Tablet', category: 'Antibiotics', manufacturer: 'Alkem Labs', brand: 'Taxim', price: 172.00, discount: 10, stock: 30, prescriptionRequired: true },
  { name: 'Oflox 200mg Tablet', genericName: 'Ofloxacin', strength: '200mg', dosageForm: 'Tablet', category: 'Antibiotics', manufacturer: 'Cipla Ltd', brand: 'Oflox', price: 88.00, discount: 5, stock: 50, prescriptionRequired: true },
  { name: 'Ciplox 500mg Tablet', genericName: 'Ciprofloxacin', strength: '500mg', dosageForm: 'Tablet', category: 'Antibiotics', manufacturer: 'Cipla Ltd', brand: 'Ciplox', price: 46.00, discount: 5, stock: 65, prescriptionRequired: true },

  // Rehydration & Emergency Electrolytes
  { name: 'Electral ORS Sachet', genericName: 'Oral Rehydration Salts (WHO formula)', strength: '21.8g Sachet', dosageForm: 'Powder', category: 'Rehydration', manufacturer: 'FDC Ltd', brand: 'Electral', price: 22.00, discount: 0, stock: 200, prescriptionRequired: false },
  { name: 'Enerzal Apple Drink', genericName: 'Balanced Energy & Electrolytes', strength: '200ml Tetra', dosageForm: 'Drops', category: 'Rehydration', manufacturer: 'FDC Ltd', brand: 'Enerzal', price: 40.00, discount: 0, stock: 85, prescriptionRequired: false },

  // Supplements, Cardiac, Diabetes, Dermatology
  { name: 'Becosules Z Capsule', genericName: 'B-Complex + Vitamin C + Zinc', strength: '20 Capsules', dosageForm: 'Capsule', category: 'Supplements', manufacturer: 'Pfizer India', brand: 'Becosules', price: 54.00, discount: 5, stock: 95, prescriptionRequired: false },
  { name: 'Shelcal 500mg Tablet', genericName: 'Calcium + Vitamin D3', strength: '500mg/250IU', dosageForm: 'Tablet', category: 'Supplements', manufacturer: 'Torrent Pharma', brand: 'Shelcal', price: 132.00, discount: 10, stock: 70, prescriptionRequired: false },
  { name: 'Limcee 500mg Chewable', genericName: 'Vitamin C (Ascorbic Acid)', strength: '500mg', dosageForm: 'Tablet', category: 'Supplements', manufacturer: 'Abbott India', brand: 'Limcee', price: 24.50, discount: 0, stock: 140, prescriptionRequired: false },
  { name: 'Zincovit Tablet', genericName: 'Multivitamin + Multimineral + Grape Seed Extract', strength: '15 Tablets', dosageForm: 'Tablet', category: 'Supplements', manufacturer: 'Apex Laboratories', brand: 'Zincovit', price: 110.00, discount: 5, stock: 80, prescriptionRequired: false },
  { name: 'Telma 40mg Tablet', genericName: 'Telmisartan', strength: '40mg', dosageForm: 'Tablet', category: 'Cardiovascular', manufacturer: 'Glenmark Pharma', brand: 'Telma', price: 240.00, discount: 15, stock: 45, prescriptionRequired: true },
  { name: 'Amlokind 5mg Tablet', genericName: 'Amlodipine', strength: '5mg', dosageForm: 'Tablet', category: 'Cardiovascular', manufacturer: 'Mankind Pharma', brand: 'Amlokind', price: 32.00, discount: 5, stock: 60, prescriptionRequired: true },
  { name: 'Atorva 20mg Tablet', genericName: 'Atorvastatin', strength: '20mg', dosageForm: 'Tablet', category: 'Cardiovascular', manufacturer: 'Zydus Cadila', brand: 'Atorva', price: 195.00, discount: 10, stock: 40, prescriptionRequired: true },
  { name: 'Glycomet-GP 1 Tablet', genericName: 'Metformin + Glimepiride', strength: '500mg/1mg', dosageForm: 'Tablet', category: 'Diabetes', manufacturer: 'USV Ltd', brand: 'Glycomet', price: 165.00, discount: 10, stock: 50, prescriptionRequired: true },
  { name: 'Januvia 100mg Tablet', genericName: 'Sitagliptin', strength: '100mg', dosageForm: 'Tablet', category: 'Diabetes', manufacturer: 'MSD Pharmaceuticals', brand: 'Januvia', price: 390.00, discount: 12, stock: 25, prescriptionRequired: true },
  { name: 'Betadine 10% Ointment', genericName: 'Povidone Iodine 10%', strength: '20g Tube', dosageForm: 'Ointment', category: 'Dermatological', manufacturer: 'Win-Medicare', brand: 'Betadine', price: 130.00, discount: 5, stock: 75, prescriptionRequired: false },
  { name: 'Soframycin Skin Cream', genericName: 'Framycetin Sulphate 1%', strength: '30g Tube', dosageForm: 'Ointment', category: 'Dermatological', manufacturer: 'Sanofi India', brand: 'Soframycin', price: 68.00, discount: 0, stock: 90, prescriptionRequired: false }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 [Seeder]: Seeding complete MediFind 2.0 dataset (MongoDB + Local JSON files)...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Create System Admin
    const adminData = {
      name: 'MediFind System Admin',
      email: 'admin@medifind.com',
      password: passwordHash,
      role: 'admin',
      phone: '9999999999',
      address: 'MG Road Headquarters, Bengaluru',
      isApproved: true
    };

    // 2. Prepare 10 Verified Pharmacies
    const pharmaciesData = PHARMACIES.map(ph => ({
      ...ph,
      password: passwordHash,
      role: 'pharmacy',
      isApproved: true
    }));

    // 3. Prepare 20 Sample Customers
    const customersData = CUSTOMERS.map(cust => ({
      ...cust,
      password: passwordHash,
      role: 'customer',
      isApproved: true
    }));

    let allUsers = [];
    let createdPharmacies = [];
    let createdCustomers = [];
    let adminUser = null;

    if (localDb.isUsingMongo()) {
      // Clear all MongoDB collections
      await User.deleteMany({});
      await Medicine.deleteMany({});
      await Order.deleteMany({});
      await Reservation.deleteMany({});
      await Prescription.deleteMany({});
      await Review.deleteMany({});
      await Notification.deleteMany({});

      adminUser = await User.create(adminData);
      createdPharmacies = await User.insertMany(pharmaciesData);
      createdCustomers = await User.insertMany(customersData);
      allUsers = [adminUser, ...createdPharmacies, ...createdCustomers];
    } else {
      adminUser = { _id: 'admin_1', ...adminData };
      createdPharmacies = pharmaciesData.map((p, i) => ({ _id: `pharmacy_${i + 1}`, ...p }));
      createdCustomers = customersData.map((c, i) => ({ _id: `customer_${i + 1}`, ...c }));
      allUsers = [adminUser, ...createdPharmacies, ...createdCustomers];
    }

    // 4. Prepare medicines across all 10 pharmacies
    const medicinesToInsert = [];
    for (const ph of createdPharmacies) {
      for (const tmpl of MEDICINE_TEMPLATES) {
        const variance = (Math.random() * 4 - 2).toFixed(2);
        const price = Math.max(10, Number((tmpl.price + Number(variance)).toFixed(2)));
        const stock = Math.floor(Math.random() * 70) + 15;

        medicinesToInsert.push({
          ...tmpl,
          price,
          stock,
          pharmacy: ph._id,
          expiryDate: new Date('2028-12-31')
        });
      }
    }

    // 5. Add Low-stock, Expiring-soon (6, 12, 21, 28 days), and Expired batches
    const ph1 = createdPharmacies[0];
    const ph2 = createdPharmacies[1];
    const ph3 = createdPharmacies[2];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    medicinesToInsert.push(
      // Expiring in 6 days
      {
        name: 'Paracetamol 500mg Batch-X',
        genericName: 'Paracetamol',
        strength: '500mg',
        dosageForm: 'Tablet',
        category: 'Analgesic',
        manufacturer: 'GSK Consumer',
        brand: 'Calpol',
        price: 18.00,
        stock: 14,
        lowStockThreshold: 10,
        pharmacy: ph1._id,
        expiryDate: new Date(now + 6 * dayMs),
        prescriptionRequired: false
      },
      // Expiring in 12 days
      {
        name: 'Cetirizine 10mg QuickRelief',
        genericName: 'Cetirizine',
        strength: '10mg',
        dosageForm: 'Tablet',
        category: 'Respiratory',
        manufacturer: 'GSK Consumer',
        brand: 'Cetzine',
        price: 20.00,
        stock: 8,
        lowStockThreshold: 10,
        pharmacy: ph1._id,
        expiryDate: new Date(now + 12 * dayMs),
        prescriptionRequired: false
      },
      // Expiring in 21 days
      {
        name: 'Omeprazole 20mg Rapid',
        genericName: 'Omeprazole',
        strength: '20mg',
        dosageForm: 'Capsule',
        category: 'Gastrointestinal',
        manufacturer: "Dr. Reddy's",
        brand: 'Omez',
        price: 55.00,
        stock: 22,
        lowStockThreshold: 10,
        pharmacy: ph1._id,
        expiryDate: new Date(now + 21 * dayMs),
        prescriptionRequired: false
      },
      // Expiring in 28 days
      {
        name: 'Dolo 650mg Promo Batch',
        genericName: 'Paracetamol',
        strength: '650mg',
        dosageForm: 'Tablet',
        category: 'Analgesic',
        manufacturer: 'Micro Labs Ltd',
        brand: 'Dolo',
        price: 28.00,
        stock: 19,
        lowStockThreshold: 10,
        pharmacy: ph3._id,
        expiryDate: new Date(now + 28 * dayMs),
        prescriptionRequired: false
      },
      // Critical Low stock (3 units)
      {
        name: 'Emergency Salbutamol Inhaler',
        genericName: 'Salbutamol',
        strength: '100mcg',
        dosageForm: 'Inhaler',
        category: 'Respiratory',
        manufacturer: 'Cipla Ltd',
        brand: 'Asthalin',
        price: 165.00,
        stock: 3,
        lowStockThreshold: 10,
        pharmacy: ph1._id,
        expiryDate: new Date('2028-06-30'),
        prescriptionRequired: true
      },
      // Expired batch (already past)
      {
        name: 'Amoxicillin 250mg Expired Batch',
        genericName: 'Amoxicillin',
        strength: '250mg',
        dosageForm: 'Capsule',
        category: 'Antibiotics',
        manufacturer: 'GSK Pharma',
        brand: 'Augmentin',
        price: 110.00,
        stock: 0,
        pharmacy: ph2._id,
        expiryDate: new Date(now - 15 * dayMs),
        isExpired: true,
        prescriptionRequired: true
      }
    );

    let allCreatedMedicines = [];
    if (localDb.isUsingMongo()) {
      allCreatedMedicines = await Medicine.insertMany(medicinesToInsert);
    } else {
      allCreatedMedicines = medicinesToInsert.map((m, i) => ({ _id: `med_${i + 1}`, ...m }));
    }

    // 6. Bulk insert 25+ Realistic Orders
    const orderStatuses = ['PLACED', 'PHARMACY_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const paymentMethods = ['cod', 'test_payment'];
    const ordersToInsert = [];

    for (let i = 0; i < 26; i++) {
      const customer = createdCustomers[i % createdCustomers.length];
      const pharmacy = createdPharmacies[i % createdPharmacies.length];
      const med1 = allCreatedMedicines[i % allCreatedMedicines.length];
      const med2 = allCreatedMedicines[(i + 5) % allCreatedMedicines.length];
      const status = orderStatuses[i % orderStatuses.length];
      const paymentMethod = paymentMethods[i % paymentMethods.length];
      const isEmergency = i % 4 === 0;

      const qty1 = Math.floor(Math.random() * 2) + 1;
      const qty2 = Math.floor(Math.random() * 2) + 1;
      const total = (med1.price * qty1) + (med2.price * qty2) + (isEmergency ? 50 : 0);

      ordersToInsert.push({
        userId: customer._id,
        pharmacyId: pharmacy._id,
        items: [
          { medicineId: med1._id, name: med1.name, quantity: qty1, price: med1.price },
          { medicineId: med2._id, name: med2.name, quantity: qty2, price: med2.price }
        ],
        totalAmount: Number(total.toFixed(2)),
        deliveryType: isEmergency ? 'emergency' : 'standard',
        paymentMethod,
        paymentStatus: status === 'DELIVERED' || paymentMethod === 'test_payment' ? 'paid' : 'pending',
        deliveryAddress: customer.address,
        deliveryPhone: customer.phone,
        status,
        timeline: [
          { status: 'PLACED', timestamp: new Date(now - (25 - i) * 60 * 60 * 1000), note: 'Order placed' },
          ...(status !== 'PLACED' ? [{ status, timestamp: new Date(), note: `Order updated to ${status}` }] : [])
        ]
      });
    }

    let allCreatedOrders = [];
    if (localDb.isUsingMongo()) {
      allCreatedOrders = await Order.insertMany(ordersToInsert);
    } else {
      allCreatedOrders = ordersToInsert.map((o, i) => ({ _id: `order_${i + 1}`, ...o }));
    }

    // 7. Bulk insert 25+ Realistic Reservations
    const resStatuses = ['pending', 'accepted', 'ready_for_pickup', 'completed', 'expired'];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const reservationsToInsert = [];

    for (let i = 0; i < 26; i++) {
      const customer = createdCustomers[i % createdCustomers.length];
      const pharmacy = createdPharmacies[i % createdPharmacies.length];
      const med = allCreatedMedicines[(i * 3) % allCreatedMedicines.length];
      const status = resStatuses[i % resStatuses.length];

      let pCode = 'MED-';
      for (let k = 0; k < 4; k++) pCode += chars.charAt(Math.floor(Math.random() * chars.length));

      reservationsToInsert.push({
        userId: customer._id,
        pharmacyId: pharmacy._id,
        medicineId: med._id,
        quantity: Math.floor(Math.random() * 2) + 1,
        pickupCode: pCode + '-' + (i + 1),
        status,
        expiresAt: new Date(now + (status === 'expired' ? -30 * 60 * 1000 : 25 * 60 * 1000))
      });
    }

    let allCreatedReservations = [];
    if (localDb.isUsingMongo()) {
      allCreatedReservations = await Reservation.insertMany(reservationsToInsert);
    } else {
      allCreatedReservations = reservationsToInsert.map((r, i) => ({ _id: `reservation_${i + 1}`, ...r }));
    }

    // 8. Bulk insert Sample Customer Reviews
    const reviewsToInsert = [];
    const reviewComments = [
      'Extremely fast 30-minute hold reservation and friendly pharmacist staff!',
      'Saved me during late night emergency. Prompt verification and stock availability.',
      'Lowest prices in the locality and well-organized medicine counter.',
      'Verified my doctor prescription within 5 minutes. Excellent service!',
      'Always has genuine stock and helpful staff. Highly recommended.',
      'Quick pickup using the unique 4-character pickup code at the counter.'
    ];

    for (let i = 0; i < 15; i++) {
      const customer = createdCustomers[i % createdCustomers.length];
      const pharmacy = createdPharmacies[i % createdPharmacies.length];
      reviewsToInsert.push({
        userId: customer._id,
        pharmacyId: pharmacy._id,
        rating: 5,
        comment: reviewComments[i % reviewComments.length]
      });
    }

    let allCreatedReviews = [];
    if (localDb.isUsingMongo()) {
      allCreatedReviews = await Review.insertMany(reviewsToInsert);
    } else {
      allCreatedReviews = reviewsToInsert.map((rv, i) => ({ _id: `review_${i + 1}`, ...rv }));
    }

    // 9. Bulk insert Sample Digital Prescriptions
    const prescriptionsToInsert = [];
    const prescStatuses = ['pending', 'approved', 'rejected', 'approved'];

    for (let i = 0; i < 8; i++) {
      const customer = createdCustomers[i];
      const pharmacy = createdPharmacies[i % createdPharmacies.length];
      const status = prescStatuses[i % prescStatuses.length];

      prescriptionsToInsert.push({
        userId: customer._id,
        pharmacyId: pharmacy._id,
        imageUrl: `/api/prescriptions/file/sample-prescription-${i + 1}.png`,
        fileType: 'image/png',
        fileSize: 1024 * 350,
        status,
        rejectionReason: status === 'rejected' ? 'Prescription doctor stamp is illegible. Please re-upload clearer copy.' : '',
        notes: `Prescription for general allergy & antibiotic treatment - Dr. K. Mehta (Reg #KA-38491)`
      });
    }

    let allCreatedPrescriptions = [];
    if (localDb.isUsingMongo()) {
      allCreatedPrescriptions = await Prescription.insertMany(prescriptionsToInsert);
    } else {
      allCreatedPrescriptions = prescriptionsToInsert.map((p, i) => ({ _id: `presc_${i + 1}`, ...p }));
    }

    // 10. Bulk insert Sample System Notifications
    const notificationsToInsert = [];
    for (let i = 0; i < 12; i++) {
      const customer = createdCustomers[i % createdCustomers.length];
      notificationsToInsert.push({
        userId: customer._id,
        title: i % 2 === 0 ? '📋 Reservation Confirmed' : '🚨 Delivery Dispatched',
        message: i % 2 === 0 
          ? 'Your 30-minute hold reservation is active. Please present your pickup code at the counter.' 
          : 'Pharmacy rider has picked up your medicine parcel and is en-route.',
        type: i % 2 === 0 ? 'RESERVATION' : 'ORDER',
        read: i % 3 === 0
      });
    }

    let allCreatedNotifications = [];
    if (localDb.isUsingMongo()) {
      allCreatedNotifications = await Notification.insertMany(notificationsToInsert);
    } else {
      allCreatedNotifications = notificationsToInsert.map((n, i) => ({ _id: `notif_${i + 1}`, ...n }));
    }

    // 11. Synchronize to Local JSON files in data/ for dual backup
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(allUsers, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, 'medicines.json'), JSON.stringify(allCreatedMedicines, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, 'orders.json'), JSON.stringify(allCreatedOrders, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, 'reservations.json'), JSON.stringify(allCreatedReservations, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, 'reviews.json'), JSON.stringify(allCreatedReviews, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, 'prescriptions.json'), JSON.stringify(allCreatedPrescriptions, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, 'notifications.json'), JSON.stringify(allCreatedNotifications, null, 2));

    console.log(`✅ Successfully seeded & synced to MongoDB and data/*.json:
- 1 System Admin
- 10 Verified Pharmacies
- 20 Registered Customers
- ${allCreatedMedicines.length} Catalog Medicine Formulations (covering low-stock, expired, & expiring-soon batches)
- ${allCreatedOrders.length} Realistic Orders (Standard & Priority Emergency)
- ${allCreatedReservations.length} Reservations with Unique Pickup Codes
- ${allCreatedReviews.length} Verified Customer Reviews
- ${allCreatedPrescriptions.length} Digital Prescriptions
- ${allCreatedNotifications.length} Live Notifications`);

    console.log('🎉 [Seeder]: MediFind 2.0 database successfully initialized & dual-synced!');
  } catch (err) {
    console.error('❌ [Seeder Error]:', err);
  }
};

if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB().then(() => {
    seedDatabase().then(() => process.exit(0));
  });
}

module.exports = { seedDatabase };
