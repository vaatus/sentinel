import { Router } from "express";
import { db } from "../db/schema";

export const patientsRouter = Router();

// VIOLATION §164.312(a)(1): no authentication middleware on PHI route.
// VIOLATION §164.312(b):    PHI access not written to an audit trail.
// VIOLATION §164.514(a):    full PHI record returned (no field minimization).
patientsRouter.get("/", async (req, res) => {
  const patients = await db.query("SELECT * FROM patients");
  res.json(patients);
});

patientsRouter.get("/:id", async (req, res) => {
  const patient = await db.query(`SELECT * FROM patients WHERE id = ${req.params.id}`);
  res.json(patient);
});

patientsRouter.post("/", async (req, res) => {
  const patient = req.body;
  await db.query(
    `INSERT INTO patients (name, ssn, dob, mrn, diagnosis) VALUES ('${patient.name}', '${patient.ssn}', '${patient.dob}', '${patient.mrn}', '${patient.diagnosis}')`,
  );
  res.json({ created: true, patient });
});
