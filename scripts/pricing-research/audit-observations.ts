/** Read-only evidence classification. It never upgrades old rows from a quote alone. */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { PrismaClient } from '@prisma/client';

type EvidenceStatus = 'VERIFIED' | 'UNVERIFIED' | 'INVALID';

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.cashifyResearchObservation.findMany({
      select: {
        id: true, experimentId: true, status: true, finalQuote: true,
        questionsAsked: true, answersSelected: true,
        experiment: { select: { questionnaireFingerprint: true } },
      },
    });
    const evidenceDir = path.resolve('research-evidence');
    const audit = rows.map((row) => {
      let evidenceStatus: EvidenceStatus = 'UNVERIFIED';
      let reason = 'no matching, visually reviewed screenshot evidence';
      const questions = row.questionsAsked;
      const badQuestion = Array.isArray(questions) && questions.some((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return true;
        const question = item as Record<string, unknown>;
        return typeof question.questionText !== 'string' || !question.questionText.trim() ||
          question.questionText.includes('(question text not detected)') ||
          typeof question.selectedAnswer !== 'string' || !question.selectedAnswer.trim();
      });
      if (row.status !== 'COMPLETED') {
        evidenceStatus = 'INVALID';
        reason = `status ${row.status} is not a final quotation`;
      } else if (!row.finalQuote || row.finalQuote <= 0 ||
        !Array.isArray(questions) || questions.length === 0 || badQuestion ||
        !row.answersSelected || !row.experiment.questionnaireFingerprint) {
        evidenceStatus = 'INVALID';
        reason = 'not a complete, auditable final quotation';
      } else {
        const manifestPath = path.join(evidenceDir, `${row.id}.json`);
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const screenshotPath = path.join(evidenceDir, path.basename(manifest.screenshotPath || ''));
            const digest = fs.existsSync(screenshotPath)
              ? crypto.createHash('sha256').update(fs.readFileSync(screenshotPath)).digest('hex') : null;
            const embeddedFingerprint = row.answersSelected && typeof row.answersSelected === 'object' &&
              !Array.isArray(row.answersSelected) && 'questionnaireFingerprint' in row.answersSelected &&
              typeof row.answersSelected.questionnaireFingerprint === 'string'
              ? row.answersSelected.questionnaireFingerprint : null;
            if (manifest.observationId === row.id && manifest.experimentId === row.experimentId &&
              manifest.finalQuote === row.finalQuote &&
              isDeepStrictEqual(manifest.questionsAsked, row.questionsAsked) &&
              isDeepStrictEqual(manifest.answersSelected, row.answersSelected) &&
              manifest.questionnaireFingerprint === (embeddedFingerprint ?? row.experiment.questionnaireFingerprint) &&
              manifest.screenshotSha256 === digest && manifest.verification === 'VISUALLY_VERIFIED') {
              evidenceStatus = 'VERIFIED';
              reason = 'DB amount, fingerprint and visually reviewed screenshot match';
            }
          } catch {
            reason = 'local evidence manifest unreadable; no verification assigned';
          }
        }
      }
      return { observationId: row.id, sourceStatus: row.status, evidenceStatus, reason };
    });
    const counts = {
      VERIFIED: audit.filter((r) => r.evidenceStatus === 'VERIFIED').length,
      UNVERIFIED: audit.filter((r) => r.evidenceStatus === 'UNVERIFIED').length,
      INVALID: audit.filter((r) => r.evidenceStatus === 'INVALID').length,
    };
    if (process.argv.includes('--labels')) {
      const labels = new Set<string>();
      for (const row of rows) {
        if (!Array.isArray(row.questionsAsked)) continue;
        for (const item of row.questionsAsked) {
          const label = item && typeof item === 'object' && 'questionText' in item ? item.questionText : null;
          if (typeof label === 'string' && (process.argv.includes('--all-labels') || /calls|touch|original screen|original display|warranty|gst.*bill/i.test(label))) labels.add(label);
        }
      }
      console.log(JSON.stringify({ labels: [...labels].sort() }, null, 2));
      return;
    }
    console.log(JSON.stringify({
      total: audit.length, counts,
      completedInvalid: audit.filter((r) => r.sourceStatus === 'COMPLETED' && r.evidenceStatus === 'INVALID').length,
      ...(process.argv.includes('--details') ? { audit } : {}),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('[research] read-only observation audit failed');
  process.exitCode = 1;
});
