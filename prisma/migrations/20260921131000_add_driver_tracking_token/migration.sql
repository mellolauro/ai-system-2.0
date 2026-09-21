-- Add secure tracking token hash for driver GPS devices.
ALTER TABLE "Driver"
ADD COLUMN "trackingTokenHash" TEXT;

CREATE UNIQUE INDEX "Driver_trackingTokenHash_key"
ON "Driver"("trackingTokenHash");
