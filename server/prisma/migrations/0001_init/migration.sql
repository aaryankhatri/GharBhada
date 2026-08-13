-- GharBhada init migration (SQLite)
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

CREATE TABLE "Property" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "landlordId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "wardNumber" INTEGER NOT NULL,
    "tole" TEXT NOT NULL,
    "municipality" TEXT NOT NULL DEFAULT 'काठमाडौं महानगरपालिका',
    "district" TEXT NOT NULL DEFAULT 'काठमाडौं',
    "monthlyRent" INTEGER NOT NULL,
    "advanceAmount" INTEGER NOT NULL,
    "rentDueDay" INTEGER NOT NULL DEFAULT 5,
    "availableFrom" DATETIME NOT NULL,
    "description" TEXT,
    "amenities" TEXT NOT NULL,
    "photos" TEXT NOT NULL,
    "googleMapsPin" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "moveInDate" DATETIME NOT NULL,
    "advanceAmount" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "agreementId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Agreement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" INTEGER NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "agreementType" TEXT NOT NULL,
    "monthlyRent" INTEGER NOT NULL,
    "advanceAmount" INTEGER NOT NULL,
    "moveInDate" DATETIME NOT NULL,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 35,
    "pdfUrl" TEXT,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agreement_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agreement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" INTEGER NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "agreementId" INTEGER,
    "paymentType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionUuid" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptUrl" TEXT,
    CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Payment_transactionUuid_key" ON "Payment"("transactionUuid");
