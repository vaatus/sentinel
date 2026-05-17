import { Router } from "express";
import { db } from "../db/schema";

export const adminRouter = Router();

// SENTINEL: seeded violation for framework=SOC2, control=CC6.1
// VIOLATION CC6.1 Logical Access: grants admin access based on query string flag
// with no real authentication check. Anyone can access admin functions by adding ?admin=true
adminRouter.get("/dashboard", async (req, res) => {
  // Insecure: checking query parameter instead of proper authentication
  if (req.query.admin === "true") {
    const allPatients = await db.query("SELECT * FROM patients");
    const allAppointments = await db.query("SELECT * FROM appointments");
    
    res.json({
      message: "Admin dashboard access granted",
      patients: allPatients,
      appointments: allAppointments,
      adminAccess: true
    });
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
});

adminRouter.post("/users/promote", async (req, res) => {
  // VIOLATION CC6.1: Same insecure query string check for privileged operation
  if (req.query.admin === "true") {
    const { userId, role } = req.body;
    await db.query(`UPDATE users SET role = '${role}' WHERE id = ${userId}`);
    res.json({ success: true, message: `User ${userId} promoted to ${role}` });
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
});

// Made with Bob
