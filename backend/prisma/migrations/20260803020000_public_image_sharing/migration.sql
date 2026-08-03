ALTER TABLE "images" ADD COLUMN "shareToken" TEXT;

CREATE UNIQUE INDEX "images_shareToken_key" ON "images"("shareToken");
