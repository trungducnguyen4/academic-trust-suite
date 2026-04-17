# ExamTrust Privacy Summary

This document summarizes how ExamTrust collects, uses, stores, and retains proctoring-related data (IP addresses, user agents, proctoring logs) and the security controls in place.

Key points

- **Data collected**: client IP address, user agent, proctoring session aggregates and integrity logs (tab switches, mouse anomalies, etc.), exam link usage. These are collected only for exam integrity, audit, and support purposes.
- **Purpose**: detect and review suspicious activity, support academic appeals, enforce location restrictions (lab whitelists), and provide analytics to instructors.
- **Retention**: default retention for IP and proctoring data is 90 days (`IP_RETENTION_DAYS`), configurable by administrators. After retention period data is pseudonymized or deleted according to operational policy.
- **Access controls**: only authorized roles (LECTURER for their course, ADMIN) can view detailed proctoring data; access is audited. Database access is restricted by role and secrets are stored in secret manager.
- **Pseudonymization & deletion**: a scheduled job or manual run will pseudonymize or delete IPs older than the retention window. Pseudonymized data is irreversible.
- **Security**: at-rest encryption, TLS for transport, provider best-practices for SMTP, and key management for secrets are recommended. Do not use global TLS bypass in production.
- **Transparency**: students should be informed that IP and proctoring logs are collected and how to request deletion or raise concerns. Contact: privacy@example.com

For operational details (purge scripts, Cron examples, environment variables), see `docs/ops/retention.md` and the backend `scripts/purge-ip-data.ts`.
