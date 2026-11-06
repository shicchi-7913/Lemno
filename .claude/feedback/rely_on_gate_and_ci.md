---
name: rely_on_gate_and_ci
description: Use gate.yaml and CI for backend and frontend validation
type: feedback
count: 4
enforce:
  - event: pre_bash
    when: '(?:^|[;&|(\n])[ \t]*(?:[A-Za-z_][A-Za-z0-9_]*=[^ \t;&|\n]+[ \t]+)*(?:mise[ \t]+(?:exec|x)[ \t]+--[ \t]+)?(?:mise[ \t]+(?:run[ \t]+)?check|cargo[ \t]+(?:\+[^ \t;&|\n]+[ \t]+)?(?:test|clippy|check)|pnpm[ \t]+(?:(?:-C|--dir|--filter)[ \t]+[^ \t;&|\n]+[ \t]+)*(?:(?:run[ \t]+)?(?:test|lint)|exec[ \t]+tsc[ \t]+--noEmit))(?=$|[ \t\r\n;&|)])'
    message: 'Rely on gate.yaml and CI for validation. Fix broken gate configuration in gate.yaml. Run checks manually only when the user explicitly requests it.'
    severity: warn
---

Rely on gate.yaml feedback and CI results for backend and frontend validation. Run tests, lint, and type checks manually only when explicitly requested, and fix broken gate configuration in gate.yaml.

**Excuse:** A manual run seemed quicker when the gate did not report a result or its configuration looked broken.
**Pointer:** Use the configured gate and CI results as the source of truth, and repair gate.yaml when its configuration is the cause.

**Why:** Lemno uses the gate and CI feedback as the basis for verification across the backend and frontend.

**How to apply:** Use gate and CI results for routine validation, including checks behind `mise check` or `mise run check`, `cargo test`, `cargo clippy`, `cargo check`, `pnpm test`, `pnpm lint`, `pnpm run test`, `pnpm run lint`, and `pnpm exec tsc --noEmit`. Report unavailable results when the gate or CI has not provided them.
