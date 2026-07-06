// @ts-ignore - Bypassing TS check to prevent Next.js from crashing if prisma client isn't generated
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Seed Users
  await prisma.user.createMany({
    data: [
      { id: 'u-buyer', phone: '9876543210', role: 'buyer', email: 'buyer@test.com', referralCode: 'REFBUYER' },
      { id: 'u-seller', phone: '9988776655', role: 'seller', email: 'seller@test.com', referralCode: 'REFSELLER' },
      { id: 'u-admin', phone: '9000000000', role: 'admin', email: 'admin@phoneify.com', referralCode: 'REFADMIN' },
      { id: 'u-tech-1', phone: '9123456780', role: 'tech', email: 'tech1@phoneify.com', referralCode: 'REFTECH1' },
    ],
    skipDuplicates: true,
  });

  // Seed Tech Float
  await prisma.techFloat.upsert({
    where: { techId: 'u-tech-1' },
    update: { cash: 50000, upi: 200000 },
    create: { techId: 'u-tech-1', cash: 50000, upi: 200000 },
  });

  // Seed Devices (Partial for demo)
  await prisma.device.createMany({
    data: [
      { id: 'd1', brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB', ram: '8GB', color: 'Titanium' },
      { id: 'd2', brand: 'Apple', model: 'iPhone 13', storage: '128GB', ram: '4GB', color: 'Midnight' },
      { id: 'd3', brand: 'Samsung', model: 'Galaxy S23 Ultra', storage: '512GB', ram: '12GB', color: 'Phantom Black' },
    ],
    skipDuplicates: true,
  });

  // Seed Listings
  await prisma.listing.createMany({
    data: [
      { id: 'l1', userId: 'u-seller', deviceId: 'd1', brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB', condition: 'like_new', price: 95000, status: 'active', city: 'Mumbai', images: '[]', isSelectTier: true, locationId: 'store-1' },
      { id: 'l3', userId: 'u-admin', deviceId: 'd2', brand: 'Apple', model: 'iPhone 13', storage: '128GB', condition: 'good', price: 45000, status: 'active', city: 'Bangalore', images: '[]', isSelectTier: true, locationId: 'store-1' },
    ],
    skipDuplicates: true,
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
