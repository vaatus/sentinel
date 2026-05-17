# Article 33 — Notification of Personal Data Breach

**Framework:** GDPR (General Data Protection Regulation)  
**Severity default:** high

## What this control requires

GDPR Article 33 requires that in the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority. To enable timely breach notification, systems must have proper logging and monitoring infrastructure that can detect potential breaches without leaking personal data into standard application logs.

## How Sentinel detects it

Sentinel uses regex pre-filtering to identify violations. The detector scans for logging statements that emit personal data using patterns like:
- `/console\.(log|info|debug|warn|error)\([^)]*\b(user|customer|email|password|token|session)/i`
- `/logger\.(info|debug|warn|trace|error)\([^)]*\b(user|customer|email|password|token)/i`
- `/log\.(info|debug|warn|error)\([^)]*\b(user|customer|email|password)/i`

It then excludes statements that use proper security logging (patterns like `/securityLog\.record|breachLog\.record/`). The Bob auditor mode is prompted to: "Identify logging statements that emit personal data directly. These leak personal data to standard logs without proper breach detection mechanisms."

## Example violation

```ts
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', email, password);
  const user = await authenticateUser(email, password);
  logger.info('User logged in:', user);
  res.json({ token: user.token });
});
```

## Example remediation

```ts
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  securityLog.record('login.attempt', { userId: email.split('@')[0] });
  const user = await authenticateUser(email, password);
  securityLog.record('login.success', { userId: user.id });
  res.json({ token: user.token });
});
```

## Related controls

- **Article 32(1)(a)** — Pseudonymisation and Encryption (protecting data at rest)
- **Article 32(1)(b)** — Confidentiality, Integrity, Availability (system security)
- **Article 32(1)(d)** — Regular Testing and Evaluation (testing breach detection)