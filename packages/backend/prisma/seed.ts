import { PrismaClient, UnitSize, UnitStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vaulta.com' },
    update: {},
    create: {
      email: 'admin@vaulta.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
      referralCode: 'ADMIN001',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create test customer
  const customerPassword = await bcrypt.hash('Customer@123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
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
  });
  console.log('Created customer user:', customer.email);

  // Create storage locations
  const locations = [
    {
      name: 'Vaulta Downtown',
      slug: 'vaulta-downtown',
      description: 'Modern storage facility in the heart of downtown. 24/7 access, climate-controlled units available.',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10001',
      latitude: 40.7128,
      longitude: -74.006,
      contactPhone: '+12125551234',
      contactEmail: 'downtown@vaulta.com',
      operatingHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '08:00', close: '20:00' },
        sunday: { open: '08:00', close: '20:00' },
      },
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      ],
      amenities: ['24_7_access', 'cctv', 'climate_control', 'elevator', 'parking'],
      isFeatured: true,
    },
    {
      name: 'Vaulta Midtown',
      slug: 'vaulta-midtown',
      description: 'Convenient midtown location with easy access to public transit. Various unit sizes available.',
      address: '456 5th Avenue',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10018',
      latitude: 40.7549,
      longitude: -73.984,
      contactPhone: '+12125552345',
      contactEmail: 'midtown@vaulta.com',
      operatingHours: {
        monday: { open: '07:00', close: '21:00' },
        tuesday: { open: '07:00', close: '21:00' },
        wednesday: { open: '07:00', close: '21:00' },
        thursday: { open: '07:00', close: '21:00' },
        friday: { open: '07:00', close: '21:00' },
        saturday: { open: '09:00', close: '18:00' },
        sunday: { open: '09:00', close: '18:00' },
      },
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      ],
      amenities: ['cctv', 'elevator', 'wifi'],
      isFeatured: true,
    },
    {
      name: 'Vaulta Brooklyn',
      slug: 'vaulta-brooklyn',
      description: 'Spacious Brooklyn facility with large units perfect for furniture and bulk storage.',
      address: '789 Atlantic Avenue',
      city: 'Brooklyn',
      state: 'NY',
      country: 'USA',
      postalCode: '11217',
      latitude: 40.6892,
      longitude: -73.9875,
      contactPhone: '+17185553456',
      contactEmail: 'brooklyn@vaulta.com',
      operatingHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '07:00', close: '20:00' },
        sunday: { open: '08:00', close: '18:00' },
      },
      images: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      ],
      amenities: ['24_7_access', 'cctv', 'loading_dock', 'parking', 'drive_up'],
      isFeatured: false,
    },
  ];

  for (const locationData of locations) {
    const location = await prisma.storageLocation.upsert({
      where: { slug: locationData.slug },
      update: {},
      create: locationData,
    });
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

        await prisma.storageUnit.upsert({
          where: {
            locationId_unitNumber: {
              locationId: location.id,
              unitNumber,
            },
          },
          update: {},
          create: {
            locationId: location.id,
            unitNumber,
            name: `${config.size} Unit ${unitCounter}`,
            size: config.size,
            dimensions: config.dimensions,
            basePriceHourly: config.priceHourly,
            basePriceDaily: config.priceDaily,
            basePriceMonthly: config.priceDaily * 25,
            currency: 'USD',
            status: i === 0 ? UnitStatus.OCCUPIED : UnitStatus.AVAILABLE,
            features: config.size === UnitSize.SMALL
              ? ['secure']
              : config.size === UnitSize.XL
                ? ['climate_controlled', 'secure', 'accessible']
                : ['secure', 'accessible'],
            floor: Math.floor(unitCounter / 10) + 1,
            qrCode: `UNIT:${location.id.slice(0, 8)}:${unitNumber}:${Date.now().toString(36)}`,
          },
        });
        unitCounter++;
      }
    }
    console.log(`Created ${unitCounter - 1} units for ${location.name}`);
  }

  // Create pricing rules
  const pricingRules = [
    {
      name: 'Weekend Surcharge',
      description: 'Extra 20% on weekends',
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
    await prisma.pricingRule.upsert({
      where: { id: rule.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: rule,
    });
  }
  console.log('Created pricing rules');

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
