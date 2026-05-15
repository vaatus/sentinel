import { Router } from "express";

export const billingRouter = Router();

billingRouter.post("/charge", async (req, res) => {
  const { patient_id, amount, mrn } = req.body;
  // VIOLATION §164.312(e)(1): outbound HTTP (non-TLS) carrying PHI to an external billing service.
  const response = await fetch("http://billing.partner-clinic.example/charge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient_id, amount, mrn }),
  });
  const data = await response.json();
  res.json(data);
});
