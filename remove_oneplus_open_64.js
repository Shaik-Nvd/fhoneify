const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.device.deleteMany({
      where: {
        brand: 'OnePlus',
        model: 'Oneplus Open',
        storage: '4 GB/64 GB'
      }
    });
    console.log('Deleted records:', result.count);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
