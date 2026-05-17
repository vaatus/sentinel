# Article 32(1)(b) — Confidentiality, Integrity, Availability

**Framework:** GDPR (General Data Protection Regulation)  
**Severity default:** high

## What this control requires

GDPR Article 32(1)(b) requires the ability to ensure the ongoing confidentiality, integrity, availability and resilience of processing systems and services. This means that all HTTP endpoints serving personal data must implement authentication mechanisms to ensure that only authorized users can access the data, maintaining confidentiality of the processing systems.

## How Sentinel detects it

Sentinel uses semantic analysis with regex pre-filtering to identify violations. The detector first scans for route definitions that handle personal data using patterns like:
- `/(users?|customers?|accounts?)Router\.(get|post|put|delete|patch)\(/i`
- `/(app|router)\.(get|post|put|delete|patch)\(\s*['"\`][^'"\`]*\/(users?|customers?|accounts?)/i`

It then excludes routes that include authentication middleware (patterns like `/requireAuth|requireBearerToken|authenticate/`). The Bob auditor mode is prompted to: "Identify HTTP endpoints serving personal data without authentication middleware. Each unauthenticated route handling personal data violates GDPR Article 32(1)(b)."

## Example violation

```ts
app.get('/api/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json(user);
});
```

## Example remediation

```ts
app.get('/api/users/:id', requireAuth, async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json(user);
});
```

## Related controls

- **Article 32(1)(a)** — Pseudonymisation and Encryption (data protection at rest)
- **Article 32(1)(d)** — Regular Testing and Evaluation (testing security measures)
- **Article 33** — Notification of Personal Data Breach (breach detection and notification)