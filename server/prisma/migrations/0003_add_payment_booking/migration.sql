-- Link Payment to Booking (SQLite)
ALTER TABLE "Payment" ADD COLUMN "bookingId" INTEGER REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
