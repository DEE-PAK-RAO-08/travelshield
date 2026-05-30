import { PrismaClient, Role, AlertType, AlertSeverity, TravelEventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TravelShield database...');

  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const userPassword = await bcrypt.hash('User@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@travelshield.ai' },
    update: {},
    create: {
      email: 'admin@travelshield.ai',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      isEmailVerified: true,
      profile: {
        create: {
          touristId: 'TS-ADMIN-001',
          nationality: 'USA',
          validUntil: new Date('2027-12-31'),
          blockchainHash: '0xadc01fee57d5e12a4b8f2c6a084ef75d8d3e23b169542fbc319b2ea51d6c8e5472',
          biometricEnabled: true,
          currentLocation: 'Marina Bay Area, Sector 4',
          currentLat: 1.2834,
          currentLng: 103.8607,
          geoFenceActive: true,
          geoFenceName: 'Marina Bay Sands',
        },
      },
      preferences: { create: {} },
    },
  });
 
  const alex = await prisma.user.upsert({
    where: { email: 'alex@travelshield.ai' },
    update: {},
    create: {
      email: 'alex@travelshield.ai',
      passwordHash: userPassword,
      firstName: 'Alex',
      lastName: 'Traveler',
      role: Role.USER,
      isEmailVerified: true,
      profile: {
        create: {
          touristId: 'TS-8924',
          nationality: 'USA',
          validUntil: new Date('2026-12-31'),
          blockchainHash: '0x7f2c6a084ef75d8d3e23b169542fbc319b2ea51d6c8e547285a812e9432e12a4',
          biometricEnabled: true,
          currentLocation: 'Marina Bay Area, Sector 4',
          currentLat: 1.2834,
          currentLng: 103.8607,
          geoFenceActive: true,
          geoFenceName: 'Marina Bay Sands',
        },
      },
      preferences: { create: {} },
    },
  });

  await prisma.emergencyContact.createMany({
    data: [
      { userId: alex.id, name: 'Sarah Traveler', relationship: 'Sister', phone: '+1 234 567 8900', isPrimary: true },
      { userId: alex.id, name: 'US Embassy', relationship: 'Consulate', phone: '+65 6476 9100', autoAlert: true },
    ],
    skipDuplicates: true,
  });

  await prisma.safeZone.createMany({
    data: [
      { name: 'Marina Bay Safe Zone', latitude: 1.2834, longitude: 103.8607, radiusM: 800, safetyScore: 98, sector: 'Sector 4', city: 'Singapore' },
      { name: 'Orchard Road Zone', latitude: 1.3048, longitude: 103.8318, radiusM: 600, safetyScore: 72, sector: 'Sector 2', city: 'Singapore' },
      { name: 'Chinatown Heritage', latitude: 1.2834, longitude: 103.8443, radiusM: 500, safetyScore: 88, sector: 'Sector 3', city: 'Singapore' },
    ],
    skipDuplicates: true,
  });

  await prisma.pointOfInterest.createMany({
    data: [
      { name: 'Police Station', type: 'police', latitude: 1.2850, longitude: 103.8620, description: 'Nearest police station' },
      { name: 'General Hospital', type: 'hospital', latitude: 1.2789, longitude: 103.8540, description: 'Emergency medical services' },
    ],
    skipDuplicates: true,
  });

  await prisma.place.createMany({
    data: [
      { name: 'Lau Pa Sat Food Court', category: 'Local Food', latitude: 1.2806, longitude: 103.8503, rating: 4.6, safetyScore: 92, distanceKm: 0.6, badge: 'Local Favorite' },
      { name: 'Marina Bay Shoppes', category: 'Shopping', latitude: 1.2839, longitude: 103.8591, rating: 4.5, safetyScore: 97, distanceKm: 0.4, badge: 'Safe Zone' },
      { name: 'Gardens by the Bay', category: 'Tourist Spot', latitude: 1.2816, longitude: 103.8636, rating: 4.8, safetyScore: 95, distanceKm: 1.2, badge: 'Top Rated' },
    ],
    skipDuplicates: true,
  });

  await prisma.alert.createMany({
    data: [
      { userId: alex.id, title: 'High Crowd Density', message: 'Avoid Downtown Square for the next 2 hours due to festival crowds.', type: AlertType.CROWD, severity: AlertSeverity.HIGH, location: 'Downtown Square', isRead: false },
      { userId: alex.id, title: 'Weather Advisory', message: 'Heavy rain expected in 30 minutes. Seek indoor shelter.', type: AlertType.WEATHER, severity: AlertSeverity.MEDIUM, location: 'Marina Bay', isRead: false },
      { userId: alex.id, title: 'Safe Zone Updated', message: 'New safe zone established near Marina Bay Sands.', type: AlertType.SAFE_ZONE, severity: AlertSeverity.LOW, location: 'Marina Bay Sands', isRead: true },
      { userId: alex.id, title: 'Moderate Crowd Ahead', message: 'Orchard Road (1.2km away)', type: AlertType.CROWD, severity: AlertSeverity.MEDIUM, location: 'Orchard Road', isRead: false },
    ],
    skipDuplicates: true,
  });

  await prisma.travelHistory.createMany({
    data: [
      { userId: alex.id, eventType: TravelEventType.SAFE_ZONE_ENTER, title: 'Entered Safe Zone', location: 'Marina Bay Sands', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { userId: alex.id, eventType: TravelEventType.ROUTE_REROUTE, title: 'AI Route Reroute', location: 'Orchard Road', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      { userId: alex.id, eventType: TravelEventType.CHECK_OUT, title: 'Hotel Check-out', location: 'Grand Hyatt', createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    ],
    skipDuplicates: true,
  });

  await prisma.safetyScore.create({
    data: {
      userId: alex.id,
      overallScore: 98,
      areaSafety: 'High',
      aiConfidence: 99.2,
      crowdDensity: 'Optimal',
      crimeRate: 'Very Low',
      weatherConditions: 'Moderate',
      latitude: 1.2834,
      longitude: 103.8607,
    },
  });

  await prisma.chatMessage.create({
    data: {
      userId: alex.id,
      role: 'assistant',
      content: "Hi Alex! 👋 I'm your AI Travel Guardian. I can help you find safe restaurants, tourist spots, and answer safety questions about your current location.",
    },
  });

  console.log('Seed complete!');
  console.log('Admin: admin@travelshield.ai / Admin@123456');
  console.log('User:  alex@travelshield.ai / User@123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
