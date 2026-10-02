# MuleTrace Security Notes

## Data Handling

- Account identifiers and personal fields are masked in API responses where possible.
- Uploaded files are validated before they enter the detection pipeline.
- Local SQLite databases and environment files are ignored by Git.
- Demo data is synthetic and must not be treated as evidence of guilt.

## Authentication

The API uses bearer tokens for authenticated routes. Roles are used to separate investigation, review, compliance, and administration actions. Client-side route state is not an authorization boundary; the API must enforce every permission.

## Audit Trail

Decisions, data access, and operational actions should be written to the audit log. Audit verification must be run against the database before relying on an exported case report.

For a production deployment:

- Store the JWT secret outside the repository.
- Use a managed database with backups and restricted network access.
- Rotate credentials and tokens.
- Put the API behind TLS and an identity-aware gateway.
- Log failed authentication and authorization events without storing raw passwords or unmasked PII.

## Review Boundary

MuleTrace flags accounts for human review. It does not determine guilt, and a freeze or report requires an authorized person to confirm the evidence.
