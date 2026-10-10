import { useState } from "react";
import { ADD_MARKETPLACE, CONTRIBUTING_URL, MARKETPLACE, REPO, REPO_URL, installCommand } from "../lib/config";
import { CommandBlock, CopyButton } from "../components/CopyButton";
import { t } from "../i18n";

// Commands mirror README.md → "Install" / "Things to know before you install"
// / "Enable for everyone in a product repository" (AC-30, AC-31). The copy
// around them lives in src/i18n.
const gs = t.gettingStarted;

const STEPS: { title: string; text: string; cmd: string; alt?: { intro: string; cmd: string }; note?: string }[] = [
  { ...gs.steps.add, cmd: ADD_MARKETPLACE },
  { ...gs.steps.install, cmd: installCommand("<name>") },
  {
    title: gs.steps.autoUpdate.title,
    text: gs.steps.autoUpdate.text(MARKETPLACE),
    cmd: "/plugin",
    alt: { intro: gs.steps.autoUpdate.altIntro, cmd: `claude plugin update <plugin>@${MARKETPLACE}` },
    note: gs.steps.autoUpdate.note,
  },
  { ...gs.steps.reload, cmd: "/reload-plugins" },
];

const UPDATES = [
  { ...gs.updates.catalog, forms: ["/plugin marketplace update", "claude plugin marketplace update"] },
  { ...gs.updates.plugin, forms: ["/plugin update", "claude plugin update"] },
];

const PRIVATE_ACCESS = "gh auth login && gh auth setup-git";

const TEAM_JSON = `{
  "extraKnownMarketplaces": {
    "${MARKETPLACE}": {
      "source": { "source": "github", "repo": "${REPO}" }
    }
  },
  "enabledPlugins": {
    "<plugin>@${MARKETPLACE}": true
  }
}`;

export function GettingStarted() {
  const [privateOpen, setPrivateOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(true);
  return (
    <div className="container narrow page" style={{ paddingTop: 48, paddingBottom: 88, gap: 40 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="eyebrow">{gs.eyebrow}</p>
        <h1 className="h1" style={{ fontSize: 40 }}>
          {gs.title}
        </h1>
        <p className="lead" style={{ maxWidth: "60ch" }}>
          {gs.lead}
        </p>
      </div>

      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className="step">
            <div className="step-rail" aria-hidden="true">
              <span className="step-n">{i + 1}</span>
              <span className="step-line" />
            </div>
            <div className="step-body">
              <h2>{s.title}</h2>
              <p>{s.text}</p>
              <CommandBlock command={s.cmd} />
              {s.alt && (
                <>
                  <p style={{ marginTop: 6 }}>{s.alt.intro}</p>
                  <CommandBlock command={s.alt.cmd} />
                </>
              )}
              {s.note && <p className="note">{s.note}</p>}
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="upd-h" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="upd-h" className="h2" style={{ fontSize: 22 }}>
          {gs.updatesTitle}
        </h2>
        <div className="updates">
          {UPDATES.map((u) => (
            <div key={u.what} className="update-card">
              <p>
                <strong style={{ fontWeight: 600 }}>{u.what}</strong> <span className="muted">{u.detail}</span>
              </p>
              {u.forms.map((cmd, j) => (
                <div key={cmd} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="form-label">{j === 0 ? gs.inClaudeCode : gs.inTerminal}</span>
                  <CommandBlock command={cmd} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className="collapsibles">
        <section>
          <button type="button" className="collapse-btn" aria-expanded={privateOpen} aria-controls="private-body" onClick={() => setPrivateOpen((v) => !v)}>
            <span className="icon" aria-hidden="true">
              {privateOpen ? "−" : "+"}
            </span>
            <span className="title">{gs.privateTitle}</span>
            <span className="hint">{gs.privateHint}</span>
          </button>
          {privateOpen && (
            <div id="private-body" className="collapse-body">
              <p>
                {gs.privateTextBefore}
                <span className="mono">{gs.privateTextCode}</span>
                {gs.privateTextAfter}
              </p>
              <CommandBlock command={PRIVATE_ACCESS} />
              <p className="faint" style={{ fontSize: 13.5 }}>
                {gs.privateNoteBefore}
                <span className="mono">{gs.privateNoteToken}</span>
                {gs.privateNoteMiddle}
                <span className="mono">{gs.privateNoteEnv}</span>
                {gs.privateNoteAfter}
              </p>
            </div>
          )}
        </section>
        <section>
          <button type="button" className="collapse-btn" aria-expanded={teamOpen} aria-controls="team-body" onClick={() => setTeamOpen((v) => !v)}>
            <span className="icon" aria-hidden="true">
              {teamOpen ? "−" : "+"}
            </span>
            <span className="title">{gs.teamTitle}</span>
            <span className="hint mono">{gs.teamHint}</span>
          </button>
          {teamOpen && (
            <div id="team-body" className="collapse-body">
              <p>
                {gs.teamTextBefore}
                <span className="mono">{gs.teamTextFile}</span>
                {gs.teamTextAfter}
              </p>
              <div className="code-file">
                <div className="code-file-head">
                  <span>{gs.teamTextFile}</span>
                  <CopyButton text={TEAM_JSON} label={t.copy.copy} className="btn btn-sm" />
                </div>
                <pre>{TEAM_JSON}</pre>
              </div>
            </div>
          )}
        </section>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        {gs.stuckBefore}
        <a href={`${REPO_URL}#readme`} target="_blank" rel="noopener noreferrer">
          {gs.stuckReadme}
        </a>
        {gs.stuckMiddle}
        <a href={CONTRIBUTING_URL} target="_blank" rel="noopener noreferrer">
          {gs.stuckContributing}
        </a>
        {gs.stuckAfter}
      </p>
    </div>
  );
}
