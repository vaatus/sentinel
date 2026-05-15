import { Router } from "express";
import { db } from "../db/schema";
import { logger } from "../utils/logger";

export const appointmentsRouter = Router();

appointmentsRouter.get("/", async (req, res) => {
  const appointments = await db.query("SELECT * FROM appointments");
  res.json(appointments);
});

appointmentsRouter.post("/", async (req, res) => {
  const appointment = req.body;
  // VIOLATION §164.312(b): logger emits PHI (patient identifiers + diagnosis) to standard logs.
  logger.info("creating appointment for patient", appointment.patient, appointment.diagnosis);
  await db.query(
    `INSERT INTO appointments (patient_id, slot, diagnosis) VALUES (${appointment.patient_id}, '${appointment.slot}', '${appointment.diagnosis}')`,
  );
  res.json({ created: true });
});
