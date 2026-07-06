const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const rawList = `Xiaomi Redmi Note 6 Pro
Xiaomi Mi A2
Xiaomi Redmi 6
Xiaomi Redmi 6 pro
Xiaomi Redmi 6A
Xiaomi Redmi Y2
Xiaomi Redmi 5
Xiaomi Redmi Note 5 Pro
Xiaomi Redmi Note 5
Xiaomi Redmi 5A
Xiaomi Redmi Y1
Redmi Y1 Lite
Mi Mix 2
Xiaomi Mi Max 2
Xiaomi Redmi 4A
Redmi 3S Prime
Xiaomi Redmi 3S
Xiaomi Mi Max
Xiaomi Mi 5
Xiaomi Redmi Note 3
Xiaomi Redmi Note 7
Xiaomi Redmi Note 7 Pro
Xiaomi Redmi Go
Xiaomi Redmi 7
Xiaomi Redmi Note 7S
Xiaomi Redmi Y3
Xiaomi Black Shark 2
Xiaomi Redmi K20
Xiaomi Redmi K20 Pro
Xiaomi Redmi 7A
Xiaomi Mi A3
Xiaomi Redmi 8A
Redmi 8
Xiaomi Redmi Note 8
Xiaomi Redmi Note 8 Pro
Xiaomi Redmi Note 9 Pro
Xiaomi Redmi 8A Dual
Xiaomi Redmi Note 9 Pro Max
Xiaomi Redmi Note 9
Xiaomi Redmi 9 Prime
Xiaomi Redmi 9
Xiaomi Redmi 9A
Xiaomi Redmi 9i
Xiaomi Mi 10T
Mi 10T Pro
Xiaomi Mi 10i
Xiaomi Redmi 9 Power
Xiaomi Redmi Note 10
Xiaomi Redmi Note 10 Pro
Xiaomi Redmi Note 10 Pro Max
Xiaomi Mi 11X Pro
Mi 11 Ultra
Xiaomi Mi 11X
Xiaomi Mi 11 Lite
Xiaomi Redmi Note 10s
Xiaomi Redmi Note 10T 5G
Xiaomi Mi 10
Xiaomi Redmi 10 Prime
Xiaomi 11 Lite NE 5G
Xiaomi Redmi Note 10 Lite
Xiaomi Redmi Note 11T 5G
Xiaomi Redmi 9 Activ
Xiaomi 11i 5G
Xiaomi 11i HyperCharge 5G
Xiaomi 11T Pro 5G
Xiaomi Redmi Note 11
Xiaomi Redmi Note 11S
Xiaomi Redmi Note 11 Pro Plus 5G
Xiaomi Redmi Note 11 Pro
Xiaomi Redmi 10
Xiaomi 12 Pro 5G
Xiaomi Redmi 10 Prime 2022
Xiaomi Redmi 10A
Xiaomi Redmi K50i 5G
Xiaomi Redmi 11 Prime 5G
Redmi 10 Power
Redmi Note 11SE
Xiaomi Redmi 11 Prime
Xiaomi Redmi A1 Plus
Xiaomi Redmi Note 12 Pro Plus 5G
Xiaomi Redmi Note 12 5G
Xiaomi Redmi Note 12 Pro 5G
13 Pro 5G
Xiaomi Redmi Note 12
Xiaomi Redmi A2 Plus
Xiaomi Redmi A2
Xiaomi Redmi 12 5G
Xiaomi Redmi 12C
Xiaomi Redmi 12
Xiaomi Redmi 13C
Xiaomi Redmi 13C 5G
Xiaomi Redmi Note 13 5G
Xiaomi Redmi Note 13 Pro 5G
Xiaomi Redmi Note 13 Pro Plus 5G
Xiaomi Redmi A3
14
14 Ultra
Redmi A1
Xiaomi 14 CIVI
Xiaomi Redmi A3x
Xiaomi Redmi 13 5G
Xiaomi Redmi Note 14 5G
Xiaomi Redmi Note 14 Pro 5G
Xiaomi Redmi Note 14 Pro Plus 5G
Xiaomi Redmi 14C 5G
Xiaomi Redmi A4 5G
Xiaomi Redmi A5
15
15 Ultra
Xiaomi Redmi 15 5G
Redmi Note 14 SE 5G
Xiaomi Redmi 15C 5G
Xiaomi Redmi Note 15 5G
Xiaomi Redmi Note 15 Pro 5G
Xiaomi Redmi Note 15 Pro Plus 5G
17 Ultra
Xiaomi 17
Xiaomi Redmi 15A 5G
Xiaomi Redmi A7 Pro 5G
Xiaomi 17T`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  const missing = [];
  
  for (const model of uniqueModels) {
    const existing = await prisma.device.findFirst({
      where: { 
        brand: { equals: 'Xiaomi', mode: 'insensitive' },
        model: { equals: model, mode: 'insensitive' }
      }
    });
    if (!existing) {
      missing.push(model);
    }
  }
  
  console.log('MISSING MODELS:', JSON.stringify(missing, null, 2));
}
main();
