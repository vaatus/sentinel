# demo-clinic-app

A *deliberately broken* healthcare app used as Sentinel's scan target.
It seeds 8 HIPAA Security Rule violations across 9 files so that
running `sentinel scan --framework hipaa --path ./demo-clinic-app`
produces a meaningful audit report.

**Do not deploy.** Every violation here is intentional.

## Seeded violations

| Control            | File                       | What is wrong                                    |
| ------------------ | -------------------------- | ------------------------------------------------ |
| §164.312(a)(1)     | `src/routes/patients.ts`   | Patient route has no auth middleware             |
| §164.312(a)(2)(i)  | `src/auth/basic.ts`        | Hardcoded admin credentials                      |
| §164.312(a)(2)(iv) | `src/db/schema.ts`         | PHI columns (ssn, dob, mrn) stored as plaintext  |
| §164.312(b)        | `src/routes/patients.ts`   | Patient access not written to an audit trail     |
| §164.312(b)-leak   | `src/routes/appointments.ts` | `logger.info(patient)` leaks PHI                |
| §164.312(d)        | `src/auth/basic.ts`        | Basic auth only                                  |
| §164.312(e)(1)     | `src/routes/billing.ts`    | Outbound HTTP (non-TLS) for billing payload      |
| §164.514(a)        | `src/routes/patients.ts`   | Full PHI returned in response (no minimization)  |
