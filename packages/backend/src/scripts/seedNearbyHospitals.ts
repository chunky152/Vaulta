// Dev/testing utility: finds real hospitals near a given point (via OpenStreetMap's
// Overpass API) and inserts a dummy StorageLocation + units at each one, so that
// activating geolocation while testing returns nearby results instead of an empty list.
//
// Usage:
//   tsx src/scripts/seedNearbyHospitals.ts --lat 0.3476 --lng 32.5789 [--radius 10]

import mongoose from 'mongoose';
import { StorageLocation } from '../modules/locations/StorageLocation.model.js';
import { StorageUnit, UnitSize, UnitStatus } from '../modules/units/StorageUnit.model.js';
import { generateSlug } from '../shared/utils/helpers.js';
import { config } from '../shared/config/index.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface Hospital {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

function parseArgs(): { lat: number; lng: number; radiusKm: number } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const lat = parseFloat(get('--lat') ?? '');
  const lng = parseFloat(get('--lng') ?? '');
  const radiusKm = parseFloat(get('--radius') ?? '10');

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    console.error('Usage: tsx src/scripts/seedNearbyHospitals.ts --lat <lat> --lng <lng> [--radius <km>]');
    process.exit(1);
  }

  return { lat, lng, radiusKm };
}

async function fetchNearbyHospitals(lat: number, lng: number, radiusKm: number): Promise<Hospital[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`Overpass API request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { elements: OverpassElement[] };

  const hospitals: Hospital[] = [];
  for (const el of data.elements) {
    const hospital = toHospital(el);
    if (hospital) hospitals.push(hospital);
  }

  return hospitals;
}

function toHospital(el: OverpassElement): Hospital | null {
  const coords = el.type === 'node' ? { lat: el.lat, lon: el.lon } : el.center;
  if (!coords?.lat || !coords?.lon) return null;

  const tags = el.tags ?? {};
  const name = tags.name ?? 'Unnamed Hospital';
  const addressParts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean);

  const hospital: Hospital = {
    name,
    latitude: coords.lat,
    longitude: coords.lon,
  };
  if (addressParts.length > 0) hospital.address = addressParts.join(' ');

  return hospital;
}

async function createDummyLocationForHospital(hospital: Hospital): Promise<void> {
  const baseName = `[TEST] Storage near ${hospital.name}`;
  let slug = generateSlug(baseName);

  let slugExists = await StorageLocation.findOne({ slug });
  let counter = 1;
  while (slugExists) {
    slug = `${generateSlug(baseName)}-${counter}`;
    slugExists = await StorageLocation.findOne({ slug });
    counter++;
  }

  const location = await StorageLocation.findOneAndUpdate(
    { slug },
    {
      name: baseName,
      slug,
      description: 'Auto-generated test data — dummy storage location seeded near a real hospital via OpenStreetMap for geolocation testing.',
      address: hospital.address ?? 'Address unavailable',
      city: 'Unknown',
      country: 'Unknown',
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      location: { type: 'Point', coordinates: [hospital.longitude, hospital.latitude] },
      operatingHours: {},
      images: [],
      amenities: ['24_7_access', 'cctv'],
      isActive: true,
      isFeatured: false,
    },
    { upsert: true, new: true }
  );

  const unitConfigs = [
    { size: UnitSize.SMALL, count: 3, priceHourly: 2.5, priceDaily: 15, dimensions: { width: 60, height: 60, depth: 60 } },
    { size: UnitSize.MEDIUM, count: 2, priceHourly: 5, priceDaily: 30, dimensions: { width: 90, height: 90, depth: 90 } },
  ];

  let unitCounter = 1;
  for (const unitConfig of unitConfigs) {
    for (let i = 0; i < unitConfig.count; i++) {
      const unitNumber = `TEST-${slug.slice(0, 6).toUpperCase()}-${String(unitCounter).padStart(3, '0')}`;

      await StorageUnit.findOneAndUpdate(
        { locationId: location._id, unitNumber },
        {
          locationId: location._id,
          unitNumber,
          name: `${unitConfig.size} Unit ${unitCounter}`,
          size: unitConfig.size,
          dimensions: unitConfig.dimensions,
          basePriceHourly: unitConfig.priceHourly,
          basePriceDaily: unitConfig.priceDaily,
          basePriceMonthly: unitConfig.priceDaily * 25,
          currency: 'USD',
          status: UnitStatus.AVAILABLE,
          features: ['secure'],
          floor: 1,
          qrCode: `UNIT:${location._id.toString().slice(0, 8)}:${unitNumber}:${Date.now().toString(36)}`,
        },
        { upsert: true, new: true }
      );
      unitCounter++;
    }
  }

  console.log(`Created dummy location "${baseName}" with ${unitCounter - 1} units`);
}

async function main() {
  const { lat, lng, radiusKm } = parseArgs();

  try {
    await mongoose.connect(config.database.url);
    console.log('Connected to MongoDB');

    console.log(`Querying Overpass API for hospitals within ${radiusKm}km of (${lat}, ${lng})...`);
    const hospitals = await fetchNearbyHospitals(lat, lng, radiusKm);

    if (hospitals.length === 0) {
      console.log('No hospitals found in that radius.');
      return;
    }

    console.log(`Found ${hospitals.length} hospital(s). Creating dummy storage locations...`);
    for (const hospital of hospitals) {
      await createDummyLocationForHospital(hospital);
    }

    console.log('Done.');
  } catch (error) {
    console.error('Error seeding nearby hospitals:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
