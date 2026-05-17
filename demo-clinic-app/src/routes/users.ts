import { Router } from "express";
import { db } from "../db/schema";

export const usersRouter = Router();

// SENTINEL: seeded violation for framework=GDPR, control=Article 32(1)(a)
// VIOLATION GDPR Article 32(1)(a): returns user record with EU residency
// without any pseudonymisation, anonymization, or data minimization.
// Returns raw PII (name, email, phone) for EU data subjects without
// appropriate technical measures to ensure security of processing.

usersRouter.get("/:id", async (req, res) => {
  const userId = req.params.id;
  
  // Query returns full user record with no pseudonymisation
  const user = await db.query(`
    SELECT 
      id,
      full_name,
      email,
      phone,
      address,
      date_of_birth,
      national_id,
      country,
      eu_resident,
      created_at
    FROM users 
    WHERE id = ${userId}
  `);
  
  if (!user || user.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  
  const userData = user[0];
  
  // VIOLATION: No pseudonymisation even for EU residents
  // Should mask/hash identifiers, use pseudonyms, or apply data minimization
  // Article 32(1)(a) requires "pseudonymisation and encryption of personal data"
  if (userData.eu_resident) {
    // Still returning raw PII despite EU residency flag
    res.json({
      id: userData.id,
      full_name: userData.full_name,           // Should be pseudonymized
      email: userData.email,                   // Should be masked/hashed
      phone: userData.phone,                   // Should be pseudonymized
      address: userData.address,               // Should be minimized
      date_of_birth: userData.date_of_birth,   // Should be generalized
      national_id: userData.national_id,       // Should be encrypted/hashed
      country: userData.country,
      eu_resident: true,
      data_protection_notice: "This user is an EU resident subject to GDPR"
    });
  } else {
    // Non-EU users also get full data (also problematic but not GDPR-specific)
    res.json(userData);
  }
});

// Additional endpoint that exposes EU resident data in bulk
usersRouter.get("/eu/residents", async (req, res) => {
  // VIOLATION: Bulk export of EU resident PII without pseudonymisation
  const euUsers = await db.query(`
    SELECT 
      id, full_name, email, phone, address, national_id
    FROM users 
    WHERE eu_resident = true
  `);
  
  // Returns array of raw PII for all EU residents
  res.json({
    count: euUsers.length,
    users: euUsers  // No pseudonymisation applied
  });
});

// Search endpoint that also violates pseudonymisation requirements
usersRouter.get("/search", async (req, res) => {
  const { email, phone, name } = req.query;
  
  // VIOLATION: Search by PII without pseudonymisation in results
  let query = "SELECT * FROM users WHERE 1=1";
  
  if (email) query += ` AND email = '${email}'`;
  if (phone) query += ` AND phone = '${phone}'`;
  if (name) query += ` AND full_name LIKE '%${name}%'`;
  
  const results = await db.query(query);
  
  // Returns full PII in search results, including for EU residents
  res.json({
    results: results,
    count: results.length
  });
});

// Made with Bob
