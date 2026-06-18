const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateFhoneifyPrice(basePrice) {
  let p = basePrice;
  if (p <= 20000) {
    p *= 1.08;
  } else if (p <= 50000) {
    p *= 1.06;
  } else {
    p *= 1.04;
  }
  return Math.round(p);
}

const cashifyData = [
  { brand: 'Apple', model: 'iPhone 13', storage: '128 GB', basePrice: 38000, condition: 'like_new' },
  { brand: 'Apple', model: 'iPhone 12', storage: '64 GB', basePrice: 25000, condition: 'excellent' },
  { brand: 'Apple', model: 'iPhone 11', storage: '64 GB', basePrice: 18000, condition: 'good' },
  { brand: 'Apple', model: 'iPhone 14 Pro', storage: '128 GB', basePrice: 75000, condition: 'like_new' },
  { brand: 'Apple', model: 'iPhone XR', storage: '64 GB', basePrice: 12000, condition: 'fair' },
  { brand: 'Samsung', model: 'Galaxy S23', storage: '128 GB', basePrice: 45000, condition: 'excellent' },
  { brand: 'Samsung', model: 'Galaxy S22 Ultra', storage: '256 GB', basePrice: 55000, condition: 'good' },
  { brand: 'Samsung', model: 'Galaxy S21 FE', storage: '128 GB', basePrice: 22000, condition: 'good' },
  { brand: 'OnePlus', model: '11R', storage: '128 GB', basePrice: 28000, condition: 'excellent' },
  { brand: 'OnePlus', model: '9 Pro', storage: '128 GB', basePrice: 24000, condition: 'good' },
  { brand: 'Google', model: 'Pixel 7', storage: '128 GB', basePrice: 35000, condition: 'excellent' },
  { brand: 'Xiaomi', model: 'Redmi Note 12 Pro', storage: '128 GB', basePrice: 15000, condition: 'like_new' },
  { brand: 'POCO', model: 'X5 Pro', storage: '128 GB', basePrice: 14000, condition: 'excellent' },
  { brand: 'Vivo', model: 'V27', storage: '128 GB', basePrice: 19000, condition: 'like_new' },
  { brand: 'OPPO', model: 'Reno 8T', storage: '128 GB', basePrice: 18000, condition: 'good' }
];

async function main() {
  console.log('Seeding Cashify refurbished listings...');
  
  // Ensure the admin user exists
  const admin = await prisma.user.upsert({
    where: { phone: '9000000000' },
    update: {},
    create: {
      id: 'u-admin',
      phone: '9000000000',
      role: 'admin',
      email: 'admin@phoneify.com',
      referralCode: 'REFADMIN'
    }
  });

  const listings = cashifyData.map((data, idx) => {
    return {
      userId: admin.id,
      deviceId: 'd-cashify-' + idx, // dummy device ID
      brand: data.brand,
      model: data.model,
      storage: data.storage,
      condition: data.condition,
      price: calculateFhoneifyPrice(data.basePrice),
      status: 'active',
      city: 'Bengaluru',
      images: '[]',
      isSelectTier: data.condition === 'like_new' || data.condition === 'excellent',
      description: `Refurbished ${data.brand} ${data.model} in ${data.condition} condition. Sourced from Cashify logic.`
    };
  });

  const created = await prisma.listing.createMany({
    data: listings,
    skipDuplicates: true
  });

  console.log(`Successfully seeded ${created.count} listings using Fhoneify algorithm.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
