# Contributing to create-express-modular

Thank you for your interest in contributing to **create-express-modular**! We welcome community contributions, bug fixes, template improvements, and documentation enhancements.

---

## 🛠 Local Development Setup

### Prerequisites

- **Node.js:** Version `18.0.0` or higher
- **npm:** Version `9.0.0` or higher
- **Git**

### Installation & Build

```bash
# 1. Clone repository
git clone https://github.com/Levi9111/npm-create-express-modular.git
cd npm-create-express-modular

# 2. Install dependencies
npm install

# 3. Compile TypeScript CLI using tsup
npm run build

# 4. Run CLI locally
node dist/bin/cli.js --help
```

---

## 🧪 Testing & Quality Assurance

Before opening any Pull Request, ensure that typechecking, build, and tests succeed:

```bash
# Run TypeScript type check
npm run typecheck

# Build the CLI bundle
npm run build

# Run integration and template tests
npm test
```

---

## 📝 Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new feature, ORM option, or generator capability
- `fix:` A bug fix in templates, route injection, or CLI parsing
- `docs:` Documentation improvements
- `test:` Adding or refactoring tests
- `refactor:` Code refactoring with no functional change
- `ci:` GitHub Actions or automation changes
- `chore:` Dependency bumps, toolchain adjustments

**Example:**
```bash
git commit -m "feat(templates): add redis caching middleware generator"
```

---

## 🔀 Pull Request Process

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/my-feature-name
   ```
2. Make your changes with focused, logical commits.
3. Add corresponding tests in `tests/` if you add new features or flags.
4. Verify all tests pass locally (`npm test && npm run typecheck`).
5. Open a Pull Request referencing any related issues.
