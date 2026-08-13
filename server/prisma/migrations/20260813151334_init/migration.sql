-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "citizenshipNumber" TEXT,
    "panNumber" TEXT,
    "occupation" TEXT,
    "organization" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetCode" TEXT,
    "resetCodeExpiresAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" SERIAL NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "wardNumber" INTEGER NOT NULL,
    "tole" TEXT NOT NULL,
    "municipality" TEXT NOT NULL DEFAULT 'काठमाडौं महानगरपालिका',
    "district" TEXT NOT NULL DEFAULT 'काठमाडौं',
    "monthlyRent" INTEGER NOT NULL,
    "advanceAmount" INTEGER NOT NULL,
    "rentDueDay" INTEGER NOT NULL DEFAULT 5,
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "amenities" TEXT NOT NULL,
    "waterAvailability" TEXT NOT NULL,
    "photos" TEXT NOT NULL,
    "googleMapsPin" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tenantName" TEXT NOT NULL,
    "tenantPermanentAddress" TEXT NOT NULL,
    "tenantTemporaryAddress" TEXT,
    "tenantCitizenshipNumber" TEXT NOT NULL,
    "tenantCitizenshipPhotoFront" TEXT NOT NULL,
    "tenantCitizenshipPhotoBack" TEXT NOT NULL,
    "tenantPhone" TEXT NOT NULL,
    "tenantEmail" TEXT,
    "tenantOccupation" TEXT NOT NULL,
    "tenantOrganization" TEXT,
    "coTenants" TEXT,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "emergencyContactRelationship" TEXT NOT NULL,
    "hasPhysicallyVisited" BOOLEAN NOT NULL DEFAULT false,
    "moveInDate" TIMESTAMP(3) NOT NULL,
    "advanceAmount" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "agreementId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitRequest" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "agreementType" TEXT NOT NULL,
    "monthlyRent" INTEGER NOT NULL,
    "advanceAmount" INTEGER NOT NULL,
    "moveInDate" TIMESTAMP(3) NOT NULL,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 35,
    "pdfUrl" TEXT,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "bookingId" INTEGER,
    "agreementId" INTEGER,
    "paymentType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionUuid" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptUrl" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionUuid_key" ON "Payment"("transactionUuid");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitRequest" ADD CONSTRAINT "VisitRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitRequest" ADD CONSTRAINT "VisitRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
