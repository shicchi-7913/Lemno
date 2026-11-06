---
name: feedback_authoring
description: Write feedback rules in English and scope them to the action that prompted them
type: feedback
count: 4
enforce:
  - event: post_edit
    path: '.claude/feedback/*.md'
    when: '[\u3041-\u3096\u30A1-\u30FA\uFF66-\uFF9D]'
    message: 'Write feedback rule descriptions, instructions, and hook messages in English by default.'
    severity: warn
---

Write feedback rule files in English by default, including descriptions, instructions, and hook messages. For every command-related correction, explicitly name all relevant commands and use `pre_bash` whenever it can reliably detect the violation. Scope file-related rules to the affected files and add edit hooks where the violation is detectable.

**Excuse:** Matching the conversation language and saving a prose rule seemed sufficient, and the `gh` example was treated as the scope of the command guidance.

**Pointer:** Use English for the stored rule and connect it to the relevant action so it reaches the agent when it applies. Apply the command guidance to every CLI involved in a correction.

**Why:** The project uses English feedback rules and needs them to surface when the relevant commands run or files change.

**How to apply:** For any command-related correction, including those involving `gh`, `git`, `pnpm`, or other tools, cover each relevant command in the `pre_bash` `when` patterns. Match the applicable subcommands or arguments narrowly enough to distinguish the violation. For JavaScript or TypeScript feedback, set `files` to the affected globs, such as `['**/*.js', '**/*.ts']`, and add `pre_edit` or `post_edit` when the violation is detectable. Use `files` alone for file-specific guidance that cannot be checked mechanically.
