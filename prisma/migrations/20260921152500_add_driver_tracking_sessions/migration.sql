-- CreateTable
CREATE TABLE "DriverTrackingSession" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverTrackingSession_pkey"
        PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverTrackingSession_tokenHash_key"
ON "DriverTrackingSession"("tokenHash");

-- CreateIndex
CREATE INDEX "DriverTrackingSession_deviceId_idx"
ON "DriverTrackingSession"("deviceId");

-- CreateIndex
CREATE INDEX "DriverTrackingSession_expiresAt_idx"
ON "DriverTrackingSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "DriverTrackingSession"
ADD CONSTRAINT "DriverTrackingSession_deviceId_fkey"
FOREIGN KEY ("deviceId")
REFERENCES "DriverTrackingDevice"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
