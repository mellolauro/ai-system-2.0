-- CreateTable
CREATE TABLE "DriverTrackingDevice" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverTrackingDevice_pkey"
        PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverTrackingDevice_tokenHash_key"
ON "DriverTrackingDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "DriverTrackingDevice_driverId_idx"
ON "DriverTrackingDevice"("driverId");

-- CreateIndex
CREATE INDEX "DriverTrackingDevice_driverId_active_idx"
ON "DriverTrackingDevice"("driverId", "active");

-- AddForeignKey
ALTER TABLE "DriverTrackingDevice"
ADD CONSTRAINT "DriverTrackingDevice_driverId_fkey"
FOREIGN KEY ("driverId")
REFERENCES "Driver"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Preserve existing tracking credentials as the first device.
INSERT INTO "DriverTrackingDevice" (
    "id",
    "driverId",
    "tokenHash",
    "name",
    "active",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text || "id"),
    "id",
    "trackingTokenHash",
    'Dispositivo migrado',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Driver"
WHERE "trackingTokenHash" IS NOT NULL
ON CONFLICT ("tokenHash") DO NOTHING;
