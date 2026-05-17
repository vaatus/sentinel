# Article 32(1)(d) — Regular Testing and Evaluation

**Framework:** GDPR (General Data Protection Regulation)  
**Severity default:** medium

## What this control requires

GDPR Article 32(1)(d) requires a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures for ensuring the security of the processing. This means that codebases handling personal data must demonstrate evidence of regular security testing, assessment, and evaluation procedures to ensure ongoing compliance and security.

## How Sentinel detects it

Sentinel uses semantic analysis with regex pre-filtering to identify violations. The detector first scans for files that handle personal data using patterns like:
- `/(users?|customers?|personal)/i`

It then excludes files that include testing or security assessment annotations (patterns like `/@gdpr-tested|@security-tested/`). The Bob auditor mode is prompted to: "Identify codebases handling personal data with no evidence of regular testing, assessment, or evaluation of security measures."

## Example violation

```ts
// src/services/userService.ts
export class UserService {
  async getUserData(userId: string) {
    return await db.users.findById(userId);
  }
  
  async updateUserProfile(userId: string, data: any) {
    return await db.users.update(userId, data);
  }
}
```

## Example remediation

```ts
// @gdpr-tested: security assessment completed 2026-05-01
// @security-tested: penetration testing Q1 2026
// src/services/userService.ts
export class UserService {
  async getUserData(userId: string) {
    return await db.users.findById(userId);
  }
  
  async updateUserProfile(userId: string, data: any) {
    return await db.users.update(userId, data);
  }
}
```

## Related controls

- **Article 32(1)(a)** — Pseudonymisation and Encryption (technical security measures)
- **Article 32(1)(b)** — Confidentiality, Integrity, Availability (system security)
- **Article 33** — Notification of Personal Data Breach (breach detection capabilities)