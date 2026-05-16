# Sentinel Control Reference

This directory contains detailed reference documentation for every compliance control that Sentinel can detect. Each control document explains what the requirement means, how Sentinel detects violations, and provides example code showing both violations and remediations.

## HIPAA Security Rule

The Health Insurance Portability and Accountability Act (HIPAA) Security Rule establishes national standards to protect individuals' electronic personal health information (ePHI).

### Access Control
- [164.312(a)(1) — Access Control](./hipaa/164-312-a-1.md) - Enforce authentication on PHI endpoints
- [164.312(a)(2)(i) — Unique User Identification](./hipaa/164-312-a-2-i.md) - No hardcoded credentials or shared accounts
- [164.312(d) — Person or Entity Authentication](./hipaa/164-312-d.md) - Strong authentication mechanisms

### Encryption & Transmission
- [164.312(a)(2)(iv) — Encryption at Rest](./hipaa/164-312-a-2-iv.md) - Encrypt PHI in database storage
- [164.312(e)(1) — Transmission Security](./hipaa/164-312-e-1.md) - Use TLS for PHI transmission

### Audit & Monitoring
- [164.312(b) — Audit Controls](./hipaa/164-312-b.md) - Log all PHI access to audit trail
- [164.312(b)-leak — Audit Logging Leak](./hipaa/164-312-b-leak.md) - Don't log PHI to standard logs
- [164.308(a)(1)(ii)(D) — Information System Activity Review](./hipaa/164-308-a-1-ii-d.md) - Implement monitoring and alerting

### Data Integrity & Management
- [164.312(c)(1) — Integrity](./hipaa/164-312-c-1.md) - Protect PHI from unauthorized alteration
- [164.514(a) — De-identification](./hipaa/164-514-a.md) - Minimize PHI in API responses
- [164.308(a)(4) — Information Access Management](./hipaa/164-308-a-4.md) - Query only necessary PHI fields

### Workforce & Access Management
- [164.308(a)(3) — Workforce Security](./hipaa/164-308-a-3.md) - Implement role-based access control
- [164.308(a)(5)(ii)(D) — Password Management](./hipaa/164-308-a-5-ii-d.md) - Enforce strong password policies

### Infrastructure & Documentation
- [164.310(a)(1) — Facility Access Controls](./hipaa/164-310-a-1.md) - Limit network access to PHI systems
- [164.308(a)(7) — Contingency Plan](./hipaa/164-308-a-7.md) - Implement backup and disaster recovery
- [164.316 — Policies and Documentation](./hipaa/164-316.md) - Document data classification

## SOC 2 Trust Services Criteria

SOC 2 is an auditing procedure that ensures service providers securely manage data to protect the interests and privacy of their clients.

### Logical Access (CC6)
- [CC6.1 — Logical Access Controls](./soc2/cc6-1.md) - Enforce authentication and authorization
- [CC6.2 — User Access Provisioning](./soc2/cc6-2.md) - Manage unique user credentials
- [CC6.6 — Encryption in Transit](./soc2/cc6-6.md) - Use TLS for external communications

### System Operations (CC7)
- [CC7.2 — System Monitoring](./soc2/cc7-2.md) - Use structured logging, not console.log
- [CC7.3 — Incident Detection](./soc2/cc7-3.md) - Don't swallow errors silently

### Change Management (CC8)
- [CC8.1 — Change Management](./soc2/cc8-1.md) - Resolve TODO/FIXME in security code

## PCI-DSS v4.0

The Payment Card Industry Data Security Standard (PCI-DSS) is a set of security standards designed to ensure that all companies that accept, process, store, or transmit credit card information maintain a secure environment.

### Cardholder Data Protection
- [3.4.1 — PAN Protection at Rest](./pci/3-4-1.md) - Encrypt stored credit card numbers
- [3.3.1 — CVV Storage Prohibited](./pci/3-3-1.md) - Never store CVV/CVC codes

### Transmission & Testing
- [4.2.1 — Strong Cryptography for Transmission](./pci/4-2-1.md) - Use TLS for payment data
- [6.4.3 — Production Test Card Data](./pci/6-4-3.md) - No test cards in production code

## Quick Reference by Severity

### Critical Severity
- HIPAA: 164.312(a)(2)(iv), 164.312(b)-leak, 164.312(e)(1)
- SOC2: CC6.6
- PCI: 3.4.1, 3.3.1, 4.2.1

### High Severity
- HIPAA: 164.312(a)(1), 164.312(a)(2)(i), 164.312(b), 164.312(d), 164.310(a)(1), 164.514(a), 164.308(a)(3)
- SOC2: CC6.1
- PCI: 6.4.3

### Medium Severity
- HIPAA: 164.312(c)(1), 164.308(a)(4), 164.308(a)(5)(ii)(D), 164.308(a)(1)(ii)(D)
- SOC2: CC6.2, CC7.2

### Low Severity
- HIPAA: 164.308(a)(7), 164.316
- SOC2: CC7.3, CC8.1

## Using This Reference

Each control document follows a consistent structure:

1. **What this control requires** - Plain English explanation of the regulatory requirement
2. **How Sentinel detects it** - Technical details of the detection strategy, including regex patterns
3. **Example violation** - Code snippet that would trigger the control
4. **Example remediation** - Corrected version of the code
5. **Related controls** - Other controls that often co-occur or are related

Use these documents to:
- Understand why Sentinel flagged a particular finding
- Learn how to remediate violations
- Educate your team about compliance requirements
- Plan your compliance implementation strategy