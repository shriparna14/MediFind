const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Medicine = require('../models/Medicine');

const seedData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('🌱 Database already populated. Skipping seeder.');
      return;
    }

    console.log('🌱 Database is empty. Seeding initial test data...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 1. Create Admin
    const admin = await User.create({
      name: 'MediFind Admin',
      email: 'admin@medifind.com',
      password: hashedPassword,
      role: 'admin',
      phone: '9999999999',
      address: 'MediFind HQ, Bengaluru',
      isApproved: true
    });

    // 2. Create Customer
    const customer = await User.create({
      name: 'John Doe',
      email: 'customer@medifind.com',
      password: hashedPassword,
      role: 'customer',
      phone: '8888888888',
      address: '7th Cross, Koramangala, Bengaluru',
      isApproved: true
    });

    // 3. Create Pharmacy 1 - Apollo Pharmacy
    const pharmacy1 = await User.create({
      name: 'Dr. Ramesh Kumar',
      email: 'pharmacy@medifind.com',
      password: hashedPassword,
      role: 'pharmacy',
      phone: '7777777777',
      address: 'Apollo Pharmacy, 12th Main Rd, Indiranagar, Bengaluru',
      shopName: 'Apollo Pharmacy (Indiranagar)',
      latitude: 12.9718,
      longitude: 77.6412,
      license: 'LIC-998811',
      isApproved: true
    });

    // 4. Create Pharmacy 2 - City Medicos
    const pharmacy2 = await User.create({
      name: 'Suresh Patel',
      email: 'city@medifind.com',
      password: hashedPassword,
      role: 'pharmacy',
      phone: '6666666666',
      address: 'City Medicos, 80 Feet Road, Koramangala, Bengaluru',
      shopName: 'City Medicos (Koramangala)',
      latitude: 12.9352,
      longitude: 77.6244,
      license: 'LIC-774433',
      isApproved: true
    });

    // 5. Seed medicines
    const apolloId = pharmacy1._id || pharmacy1.id;
    const cityId = pharmacy2._id || pharmacy2.id;

    // Medicines for Apollo Pharmacy
    await Medicine.create({
      name: 'Dolo 650',
      brand: 'Micro Labs',
      category: 'Analgesic',
      price: 30.5,
      stock: 120,
      expiryDate: new Date('2028-12-31'),
      prescriptionRequired: false,
      pharmacyId: apolloId
    });

    await Medicine.create({
      name: 'Crocin 650',
      brand: 'GlaxoSmithKline',
      category: 'Analgesic',
      price: 25.0,
      stock: 0, // Out of stock to test alternative fallback suggestions!
      expiryDate: new Date('2028-06-30'),
      prescriptionRequired: false,
      pharmacyId: apolloId
    });

    await Medicine.create({
      name: 'Augmentin 625 DUO',
      brand: 'GlaxoSmithKline',
      category: 'Antibiotic',
      price: 168.2,
      stock: 45,
      expiryDate: new Date('2027-09-30'),
      prescriptionRequired: true, // Requires prescription
      pharmacyId: apolloId
    });

    await Medicine.create({
      name: 'Okacet 10mg',
      brand: 'Cipla',
      category: 'Antihistamine',
      price: 18.0,
      stock: 90,
      expiryDate: new Date('2028-11-15'),
      prescriptionRequired: false,
      pharmacyId: apolloId
    });

    // Medicines for City Medicos
    await Medicine.create({
      name: 'Calpol 650',
      brand: 'GlaxoSmithKline',
      category: 'Analgesic',
      price: 22.0,
      stock: 80,
      expiryDate: new Date('2028-10-31'),
      prescriptionRequired: false,
      pharmacyId: cityId
    });

    await Medicine.create({
      name: 'Crocin 650',
      brand: 'GlaxoSmithKline',
      category: 'Analgesic',
      price: 24.5,
      stock: 65, // In stock here! So searching Crocin will suggest City Medicos or Apollo's alternatives
      expiryDate: new Date('2028-06-30'),
      prescriptionRequired: false,
      pharmacyId: cityId
    });

    await Medicine.create({
      name: 'Ecosprin 75',
      brand: 'USV Pvt Ltd',
      category: 'Cardiovascular',
      price: 9.8,
      stock: 140,
      expiryDate: new Date('2029-03-25'),
      prescriptionRequired: true, // Requires prescription
      pharmacyId: cityId
    });

    await Medicine.create({
      name: 'Combiflam',
      brand: 'Sanofi India',
      category: 'Analgesic',
      price: 15.2,
      stock: 200,
      expiryDate: new Date('2028-08-20'),
      prescriptionRequired: false,
      pharmacyId: cityId
    });

    console.log('✅ Seeding completed! Default accounts:');
    console.log('   - Customer: customer@medifind.com | password123');
    console.log('   - Pharmacy 1: pharmacy@medifind.com | password123 (Apollo Pharmacy - Indiranagar)');
    console.log('   - Pharmacy 2: city@medifind.com | password123 (City Medicos - Koramangala)');
    console.log('   - Admin: admin@medifind.com | password123');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
  }
};

module.exports = seedData;
