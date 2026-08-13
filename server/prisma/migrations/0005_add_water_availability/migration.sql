-- Add water availability schedule to Property (SQLite)
-- Default backfills existing rows as "24hours" (safest guess); landlords can edit later.
ALTER TABLE "Property" ADD COLUMN "waterAvailability" TEXT NOT NULL DEFAULT '{"type":"24hours","daysPerWeek":7,"timesPerDay":1,"hoursPerSession":24,"timeSlots":[]}';
