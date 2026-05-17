import express from "express";
import { patientsRouter } from "./routes/patients";
import { appointmentsRouter } from "./routes/appointments";
import { billingRouter } from "./routes/billing";
import { adminRouter } from "./routes/admin";
import { usersRouter } from "./routes/users";
import { logger } from "./utils/logger";

const app = express();
app.use(express.json());

app.use("/api/patients", patientsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/billing", billingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/users", usersRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 4100;
const HOST = "0.0.0.0"; // Binds to all interfaces without IP restrictions
app.listen(PORT, HOST, () => logger.info(`demo-clinic-app listening on ${HOST}:${PORT}`));
// trigger: Sentinel demo PR recording 1779027747
