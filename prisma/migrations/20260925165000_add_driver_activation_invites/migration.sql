-- CreateTable
CREATE TABLE "DriverActivation" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverActivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverActivation_tokenHash_key"
ON "DriverActivation"("tokenHash");

-- CreateIndex
CREATE INDEX "DriverActivation_driverId_idx"
ON "DriverActivation"("driverId");

-- CreateIndex
CREATE INDEX "DriverActivation_expiresAt_idx"
ON "DriverActivation"("expiresAt");

-- AddForeignKey
ALTER TABLE "DriverActivation"
ADD CONSTRAINT "DriverActivation_driverId_fkey"
FOREIGN KEY ("driverId")
REFERENCES "Driver"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
