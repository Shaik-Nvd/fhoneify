/** Read-only, aggregate inspection of isolated Cashify research records. */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const [experiments, observations] = await Promise.all([
      prisma.cashifyResearchExperiment.findMany({
        select: {
          id: true, brand: true, model: true, storage: true, profile: true,
          status: true, originalGetUptoReference: true, finalQuote: true,
          questionsAsked: true, answersSelected: true,
        },
      }),
      prisma.cashifyResearchObservation.findMany({
        select: {
          experimentId: true, status: true, finalQuote: true,
          questionsAsked: true, answersSelected: true,
        },
      }),
    ]);
    const byStatus = Object.fromEntries(
      [...new Set(experiments.map((row) => row.status))].map((status) => [
        status, experiments.filter((row) => row.status === status).length,
      ])
    );
    const byObservationStatus = Object.fromEntries(
      [...new Set(observations.map((row) => row.status))].map((status) => [
        status, observations.filter((row) => row.status === status).length,
      ])
    );
    const pocoExperiments = experiments.filter((row) => row.brand.toLowerCase() === 'poco');
    const pocoIds = new Set(pocoExperiments.map((row) => row.id));
    console.log(JSON.stringify({
      experimentCount: experiments.length,
      observationCount: observations.length,
      byStatus,
      byObservationStatus,
      pocoExperiments,
      pocoObservations: observations.filter((row) => pocoIds.has(row.experimentId)),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`[pricing-research:inspect] ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
});
