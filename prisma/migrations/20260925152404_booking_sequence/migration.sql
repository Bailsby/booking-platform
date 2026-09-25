-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 0;
