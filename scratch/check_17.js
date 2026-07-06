const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const d = await prisma.device.findMany({where:{model:{contains:'iPhone 17'}}, include:{quotes:true}});
  console.log(JSON.stringify(d, null, 2));
}
main().finally(() => prisma.$disconnect());
