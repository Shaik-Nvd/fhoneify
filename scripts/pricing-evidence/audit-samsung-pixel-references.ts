import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

/** Explicitly read-only production audit; no refresh, import or user tables. */
async function main() {
  config({path: process.argv[2],quiet:true});
  const prisma=new PrismaClient();
  try {
    const result=await prisma.$transaction(async tx=>{
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const mode=await tx.$queryRawUnsafe<any[]>('SHOW transaction_read_only');
      if(mode[0]?.transaction_read_only!=='on')throw new Error('Audit transaction is not read-only');
      const references=await tx.referencePrice.findMany({where:{brand:{in:['Samsung','Google']}},select:{deviceKey:true,brand:true,model:true,storage:true,currentPrice:true,status:true,lastVerifiedAt:true,sourceUrl:true}});
      const profiles=await tx.cashifyQuestionnaireProfile.findMany({where:{brand:{in:['Samsung','Google']}},select:{modelKey:true,brand:true,model:true,warrantyMode:true,billMode:true,ageMode:true,status:true,observedAt:true,variantsChecked:true}});
      return {at:new Date().toISOString(),readOnly:true,references,profiles};
    },{timeout:30000});
    fs.writeFileSync('release-test-logs/samsung-pixel/reference-audit.json',JSON.stringify(result,null,2));
    for(const brand of ['Samsung','Google'])console.log(JSON.stringify({brand,references:result.references.filter(r=>r.brand===brand).length,profiles:result.profiles.filter(r=>r.brand===brand).length,readOnly:result.readOnly,at:result.at}));
  } finally {await prisma.$disconnect();}
}
main().catch(()=>{console.error('Read-only reference audit failed; credentials and connection details withheld');process.exitCode=1;});
