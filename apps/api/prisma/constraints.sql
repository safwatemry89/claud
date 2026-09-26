-- Apply after `prisma migrate dev` (Prisma cannot express CHECK constraints natively).
-- Add these statements to the generated migration.sql to keep them under version control.
ALTER TABLE "GlucoseLog"    ADD CONSTRAINT glucose_value_range   CHECK ("valueMgPerDl" BETWEEN 20 AND 600);
ALTER TABLE "SymptomLog"    ADD CONSTRAINT symptom_severity      CHECK ("severityScore" BETWEEN 1 AND 10);
ALTER TABLE "HydrationLog"  ADD CONSTRAINT hydration_amount      CHECK ("amountMl" BETWEEN 1 AND 2000);
ALTER TABLE "MealLog"       ADD CONSTRAINT meal_program_day      CHECK ("programDayNumber" BETWEEN 1 AND 90);
ALTER TABLE "ProgramState"  ADD CONSTRAINT program_day_range     CHECK ("currentDayNumber" BETWEEN 1 AND 90);
ALTER TABLE "ProgramState"  ADD CONSTRAINT program_week_cycle    CHECK ("currentWeekCycle" BETWEEN 1 AND 4);
-- Carbs may only be recorded after fiber and protein (Friday glycemic sequence).
ALTER TABLE "MealLog"       ADD CONSTRAINT meal_sequence_order   CHECK (NOT "carbsConsumedLast" OR ("fiberConsumedFirst" AND "proteinConsumedSecond"));
