-- Adds the failed-attempt counter used to destroy an OTP after too many wrong
-- guesses. Additive only: a new column with a default, no data rewritten and no
-- existing column or row touched. Apply BEFORE deploying the code that uses it;
-- the previous build simply ignores the extra column.
ALTER TABLE "WhatsAppOTP" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
