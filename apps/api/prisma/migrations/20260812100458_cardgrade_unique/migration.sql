-- CardGrade: grade is unique PER CARD (multiple cards may share PSA_10), not globally.
DROP INDEX IF EXISTS "CardGrade_grade_key";

-- Recreate the per-card uniqueness as a compound unique index (mirrors @@unique([cardId, grade])).
CREATE UNIQUE INDEX "CardGrade_cardId_grade_key" ON "CardGrade"("cardId", "grade");
