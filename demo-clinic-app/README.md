# demo-clinic-app

A *deliberately broken* healthcare app used as Sentinel's scan target.
It seeds **14 compliance violations** across multiple frameworks (HIPAA, SOC 2, PCI DSS, GDPR)
so that running `sentinel scan` produces meaningful audit reports for each framework.

**Do not deploy.** Every violation here is intentional.

## Seeded violations

### HIPAA Security Rule (9 violations)

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
| §164.310(a)(1)     | `src/server.ts`            | Server binds to 0.0.0.0 without IP restrictions  |

### SOC 2 Trust Services Criteria (2 violations)

| Control | File                    | What is wrong                                           |
| ------- | ----------------------- | ------------------------------------------------------- |
| CC6.1   | `src/routes/admin.ts`   | Admin access granted via query string (?admin=true)     |
| CC7.2   | `src/db/migrations.ts`  | Database migration alters sensitive columns without audit trail |

### PCI DSS (2 violations)

| Control | File              | What is wrong                                              |
| ------- | ----------------- | ---------------------------------------------------------- |
| 3.4.1   | `src/payments.ts` | Credit card numbers stored unencrypted in transactions table |
| 4.2.1   | `src/payments.ts` | PAN transmitted over HTTP (not HTTPS) to payment gateway   |

### GDPR (1 violation)

| Control         | File                  | What is wrong                                           |
| --------------- | --------------------- | ------------------------------------------------------- |
| Article 32(1)(a) | `src/routes/users.ts` | EU resident PII returned without pseudonymisation      |

## Total: 14 violations across 4 frameworks
