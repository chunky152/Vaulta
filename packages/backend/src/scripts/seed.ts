import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../modules/auth/User.model.js';
import { StorageLocation } from '../modules/locations/StorageLocation.model.js';
import { StorageUnit, UnitSize, UnitStatus } from '../modules/units/StorageUnit.model.js';
import { PricingRule } from '../modules/units/PricingRule.model.js';
import { config } from '../shared/config/index.js';

async function main() {
  try {
    await mongoose.connect(config.database.url);
    console.log('Connected to MongoDB');

    console.log('Seeding database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin@123456', 12);
    const admin = await User.findOneAndUpdate(
      { email: 'admin@unbur.com' },
      {
        email: 'admin@unbur.com',
        passwordHash: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.SUPER_ADMIN,
        emailVerified: true,
        referralCode: 'ADMIN001',
      },
      { upsert: true, new: true }
    );
    console.log('Created admin user:', admin.email);

    // Create test customer
    const customerPassword = await bcrypt.hash('Customer@123', 12);
    const customer = await User.findOneAndUpdate(
      { email: 'customer@example.com' },
      {
        email: 'customer@example.com',
        passwordHash: customerPassword,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        role: UserRole.CUSTOMER,
        emailVerified: true,
        referralCode: 'CUST0001',
        loyaltyPoints: 500,
      },
      { upsert: true, new: true }
    );
    console.log('Created customer user:', customer.email);

    // Create storage locations
    const locations = [
      {
        name: 'Unbur Nakasero',
        slug: 'unbur-nakasero',
        description: 'Modern storage facility in the heart of Kampala\'s central business district. 24/7 access, climate-controlled units available.',
        address: '14 Kampala Road, Nakasero',
        city: 'Kampala',
        state: 'Central Region',
        country: 'Uganda',
        latitude: 0.3163,
        longitude: 32.5822,
        contactPhone: '+256414251234',
        contactEmail: 'nakasero@unbur.com',
        operatingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '08:00', close: '20:00' },
          sunday: { open: '08:00', close: '20:00' },
        },
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
        amenities: ['24_7_access', 'cctv', 'climate_control', 'elevator', 'parking'],
        isFeatured: true,
      },
      {
        name: 'Unbur Ntinda',
        slug: 'unbur-ntinda',
        description: 'Convenient Ntinda location with easy access to the Northern Bypass. Various unit sizes available.',
        address: 'Plot 45 Ntinda Road, Ntinda',
        city: 'Kampala',
        state: 'Central Region',
        country: 'Uganda',
        latitude: 0.3617,
        longitude: 32.6103,
        contactPhone: '+256414252345',
        contactEmail: 'ntinda@unbur.com',
        operatingHours: {
          monday: { open: '07:00', close: '21:00' },
          tuesday: { open: '07:00', close: '21:00' },
          wednesday: { open: '07:00', close: '21:00' },
          thursday: { open: '07:00', close: '21:00' },
          friday: { open: '07:00', close: '21:00' },
          saturday: { open: '09:00', close: '18:00' },
          sunday: { open: '09:00', close: '18:00' },
        },
        images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'],
        amenities: ['cctv', 'elevator', 'wifi'],
        isFeatured: true,
      },
      {
        name: 'Unbur Entebbe',
        slug: 'unbur-entebbe',
        description: 'Spacious Entebbe facility near the airport with large units perfect for furniture and bulk storage.',
        address: 'Plot 12 Berkeley Road, Entebbe',
        city: 'Entebbe',
        state: 'Central Region',
        country: 'Uganda',
        latitude: 0.0512,
        longitude: 32.4637,
        contactPhone: '+256414253456',
        contactEmail: 'entebbe@unbur.com',
        operatingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '07:00', close: '20:00' },
          sunday: { open: '08:00', close: '18:00' },
        },
        images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
        amenities: ['24_7_access', 'cctv', 'loading_dock', 'parking', 'drive_up'],
        isFeatured: false,
      },
    ];

    for (const locationData of locations) {
      const location = await StorageLocation.findOneAndUpdate(
        { slug: locationData.slug },
        {
          ...locationData,
          location: { type: 'Point', coordinates: [locationData.longitude, locationData.latitude] },
        },
        { upsert: true, new: true }
      );
      console.log('Created location:', location.name);

      // Create units for each location
      const unitConfigs = [
        { size: UnitSize.SMALL, count: 10, priceHourly: 2.5, priceDaily: 15, dimensions: { width: 60, height: 60, depth: 60 } },
        { size: UnitSize.MEDIUM, count: 8, priceHourly: 5, priceDaily: 30, dimensions: { width: 90, height: 90, depth: 90 } },
        { size: UnitSize.LARGE, count: 5, priceHourly: 8, priceDaily: 50, dimensions: { width: 120, height: 150, depth: 120 } },
        { size: UnitSize.XL, count: 3, priceHourly: 15, priceDaily: 80, dimensions: { width: 200, height: 200, depth: 200 } },
      ];

      let unitCounter = 1;
      for (const config of unitConfigs) {
        for (let i = 0; i < config.count; i++) {
          const unitNumber = `${location.slug.split('-')[1]?.toUpperCase().slice(0, 3) ?? 'UNT'}-${String(unitCounter).padStart(3, '0')}`;

          await StorageUnit.findOneAndUpdate(
            { locationId: location._id, unitNumber },
            {
              locationId: location._id,
              unitNumber,
              name: `${config.size} Unit ${unitCounter}`,
              size: config.size,
              dimensions: config.dimensions,
              basePriceHourly: config.priceHourly,
              basePriceDaily: config.priceDaily,
              basePriceMonthly: config.priceDaily * 25,
              currency: 'USD',
              status: i === 0 ? UnitStatus.OCCUPIED : UnitStatus.AVAILABLE,
              features:
                config.size === UnitSize.SMALL
                  ? ['secure']
                  : config.size === UnitSize.XL
                    ? ['climate_controlled', 'secure', 'accessible']
                    : ['secure', 'accessible'],
              floor: Math.floor(unitCounter / 10) + 1,
              qrCode: `UNIT:${location._id.toString().slice(0, 8)}:${unitNumber}:${Date.now().toString(36)}`,
            },
            { upsert: true, new: true }
          );
          unitCounter++;
        }
      }
      console.log(`Created ${unitCounter - 1} units for ${location.name}`);
    }

    // Create pricing rules
    const pricingRules = [
      {
        name: 'Weekend Surcharge',
        description: '20% extra on weekends',
        ruleType: 'time',
        conditions: { dayOfWeek: [0, 6] },
        multiplier: 1.2,
        priority: 1,
      },
      {
        name: 'Long-term Discount',
        description: '10% off for bookings over 7 days',
        ruleType: 'duration',
        conditions: { minDuration: 168 },
        multiplier: 0.9,
        priority: 2,
      },
      {
        name: 'Large Unit Discount',
        description: '5% off for XL units',
        ruleType: 'size',
        conditions: { unitSize: ['XL'] },
        multiplier: 0.95,
        priority: 1,
      },
    ];

    for (const rule of pricingRules) {
      await PricingRule.findOneAndUpdate({ name: rule.name }, rule, { upsert: true, new: true });
    }
    console.log('Created pricing rules');

    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
