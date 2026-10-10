# Evals

Behavior cases run before every release (`docs/RELEASES.md`):

- `positive/` — requests where the component **must** activate, with the
  expected result.
- `negative/` — unrelated requests where the component **must not**
  activate.
- `workflow/` — at least one case exercising the full composition
  (agent + skills + hooks + dependencies).

Each case states the input, the expected behavior and the pass criterion.
