# Article 32(1)(a) — Pseudonymisation and Encryption

**Framework:** GDPR (General Data Protection Regulation)  
**Severity default:** critical

## What this control requires

GDPR Article 32(1)(a) requires controllers and processors to implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including as appropriate the pseudonymisation and encryption of personal data. This means that personal data stored in databases must be protected through encryption-at-rest or pseudonymisation techniques to prevent unauthorized access in case of a data breach.

## How Sentinel detects it

Sentinel uses semantic analysis with regex pre-filtering to identify violations. The detector first scans for database schema definitions that store personal data using patterns like:
- `/(email|name|address|phone|user_id|customer_id)\s*:\s*(varchar|text|string)/i`
- `/column\(['"](email|name|address|phone|user_id|customer_id)['"]/i`

It then excludes columns that include encryption or pseudonymisation annotations (patterns like `/encrypted_|pseudonymized_/i`). The Bob auditor mode is prompted to: "Identify database schema fields that store personal data (email, name, address, phone, user identifiers) as plaintext with no encryption or pseudonymisation annotation."

## Example violation

```ts
const userSchema = {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
};
```

## Example remediation

```ts
const userSchema = {
  id: serial('id').primaryKey(),
  email: encrypted_varchar('email', { length: 255 }),
  name: encrypted_varchar('name', { length: 255 }),
  address: encrypted_text('address'),
  phone: pseudonymized_varchar('phone', { length: 20 }),
};
```

## Related controls

- **Article 32(1)(b)** — Confidentiality, Integrity, Availability (ensures ongoing security of processing systems)
- **Article 32(1)(d)** — Regular Testing and Evaluation (requires testing of security measures)
- **Article 33** — Notification of Personal Data Breach (breach notification requirements)