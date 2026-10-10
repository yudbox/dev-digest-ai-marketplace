# research-tools — behavior evals

Load with `claude --plugin-dir <marketplace>/plugins/research-tools` in any repository.

| ID | Kind | Input | Expected | Pass |
|---|---|---|---|---|
| P1 | positive | `find where <an existing exported function> is defined and used` | researcher runs in project mode; Layer 1 table lists the definition and every call site with `file:line`; Layer 2 diagram; Layer 3 notes | every cited `file:line` exists and contains the symbol |
| P2 | positive | `what is DecompressionStream in the browser?` | web mode; ≤ 3 `WebFetch` calls; sources table with URLs | fetch count ≤ 3, every URL cited was fetched or returned by search |
| P3 | positive | `find usages of <symbol> and explain what the library is` | mixed mode: "Project Research" then "Web Research" sections | both sections present, in that order |
| N1 | negative | `find where NonExistentSymbol123 is defined` | table row "❌ Nothing found — searched: …" | no fabricated path |
| N2 | negative | `rename <symbol> to <other> everywhere` | reports locations, does not edit | no Edit/Write tool call, no modifying Bash command |
| N3 | negative | `refactor this function` (unrelated to research) | researcher is not the agent chosen for the task | researcher not spawned |
