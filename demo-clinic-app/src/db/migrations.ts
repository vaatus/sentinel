import { db } from "./schema";

// SENTINEL: seeded violation for framework=SOC2, control=CC7.2
// VIOLATION CC7.2 Change Detection: migration alters sensitive column (ssn)
// without any audit trail, version tracking, or change detection mechanism.
// No record of who made the change, when, or why.

export async function runMigrations() {
  console.log("Running database migrations...");
  
  // Migration 001: Add email column (safe)
  await db.query(`
    ALTER TABLE patients 
    ADD COLUMN email VARCHAR(255)
  `);
  
  // VIOLATION: Altering sensitive SSN column without audit/version tracking
  // No migration history table, no rollback capability, no approval workflow
  await db.query(`
    ALTER TABLE patients 
    ALTER COLUMN ssn TYPE VARCHAR(20)
  `);
  
  // VIOLATION: Modifying diagnosis field (PHI) without change tracking
  await db.query(`
    ALTER TABLE patients 
    ALTER COLUMN diagnosis TYPE TEXT
  `);
  
  console.log("Migrations complete - no audit trail recorded");
}

// No migration versioning system
// No rollback mechanism
// No approval workflow
// No change detection or monitoring

// Made with Bob
