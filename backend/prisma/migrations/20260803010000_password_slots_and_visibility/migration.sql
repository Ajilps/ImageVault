CREATE TYPE "ImageVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- Existing images remain organisation-visible. New uploads must explicitly
-- choose PUBLIC or PRIVATE through the API contract.
ALTER TABLE "images"
ADD COLUMN "visibility" "ImageVisibility" NOT NULL DEFAULT 'PUBLIC';

CREATE INDEX "images_organizationId_visibility_createdAt_idx"
ON "images"("organizationId", "visibility", "createdAt");
