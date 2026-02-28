# Feature Development Workflow & Guidelines

This directory (`md/feature/`) contains planning, documentation, and progress tracking for all individual features within the Trade Automator project. 

To maintain a clean, stable, and transparent codebase, any new agent or developer contributing to this project must follow this **strict development workflow**.

## 1. Feature Specifications
Every new feature should have a dedicated folder and/or a timestamped markdown file documenting its scope, constraints, and implementation plan (e.g., `feature_name/feature_name_YYYYMMDD.md`).

## 2. Mandatory Testing Requirement
Development of a feature is **never considered complete** until it has fully functional, accompanying automated tests. Depending on the feature's tech stack, you must include:
- **Node.js**: Unit or integration tests using **Vitest** for backend api routes, database logic, and React frontend components.
- **Python**: Unit or integration tests using **Pytest** for independent Python modules (e.g., Telegram listeners, order executors).
- **End-to-End**: Full browser flow tests using **Playwright** (`tests/e2e/`) for major user interactions.

### Regression Testing
*When a feature is "done," you must run the **entire** test suite (`npm run test`, `npm run test:e2e`, and `pytest`) against the codebase. This ensures the new feature works as intended **and** guarantees it hasn't broken any previously developed functionality.*

## 3. Tracking & Sign-Off
- Once a feature and its corresponding tests are fully implemented, you must update the project's documentation (like `md/readme.md` or the active feature's markdown breakdown) to **tick off the feature** as completed (✅). 
- This serves as a vital signal to anyone joining the project, cleanly illustrating the overall state of the application and preventing duplicate efforts.

## 4. Milestone Check-ins & Walkthroughs
When a feature is completely finished and committed to Git (or when reaching a major milestone), you must generate or update a walkthrough log. This log should summarize the development cycle and must include:
- **Timestamp** of the accomplishment.
- **What was achieved** (i.e. summarizing the actual changes made).
- **Failures, roadblocks, or known limitations** encountered during the build.

*Why document failures?* Because it provides crucial architectural context for future agents and developers who might encounter the same constraints or attempt to refactor your code.

By adhering to these rules, the Trade Automator project will remain highly tested, self-documenting, and robust.
