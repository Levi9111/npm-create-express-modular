# Changelog

All notable changes to this project will be documented in this file.

## [2.0.2] - 2026-04-21

### Fixed
- `app.ts` now generates correctly without literal `${rateLimitImport}` / `${rateLimitUse}` strings.
- Removed duplicate `globalErrorhandler.ts` from the template folder — it is now generated dynamically by the CLI only.
- `handleZodError`, `handleCastError`, `handleValidationError`, `handleDuplicateError` are now correctly scaffolded in `src/app/errors/`.

## [2.0.0] - 2026-04-21

### Added
- **Interactive CLI**: Completely rewritten using `inquirer` for a modern project setup experience.
- **Modular Database Support**: Choose between Mongoose, Prisma, PostgreSQL, MySQL, MariaDB, and CockroachDB.
- **Modular Validator Support**: Choose between Zod, Joi, Vine, and Yup.
- **Utility Commands**:
  - `cem add env <key>`: Instantly manage environment variables.
  - `cem add middleware <name>`: Scaffold new middlewares with standard templates.
- **Global Rate Limiting**: Integrated `express-rate-limit` as a global middleware when Auth is selected.
- **Stack-Aware Error Handling**: Precise error mapping for different databases and validators.

### Changed
- **Architecture**: Moved to a more modular internal structure (`lib/db`, `lib/validator`, `lib/core`).
- **Auth Module**: Now stack-aware and includes brute-force protection.
- **Module Generator**: Auto-detects project validator for consistent stubs.

### Fixed
- Improved route auto-wiring logic.
- Standardized JSON response shape across all generators.
