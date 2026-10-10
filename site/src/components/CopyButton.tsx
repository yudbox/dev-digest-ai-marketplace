import { useEffect, useRef } from "react";
import { t } from "../i18n";
import { useCopy } from "./useCopy";

export function ManualCopy({ text }: { text: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <label className="manual-copy-wrap">
      <span>{t.copy.manual}</span>
      <input ref={ref} className="manual-copy" readOnly value={text} onFocus={(e) => e.currentTarget.select()} />
    </label>
  );
}

/** A button that copies `text`; falls back to a selected field (AC-15). */
export function CopyButton({
  text,
  label = t.copy.install,
  className = "btn btn-primary btn-sm btn-copy",
  icon = false,
}: {
  text: string;
  label?: string;
  className?: string;
  icon?: boolean;
}) {
  const { state, copy } = useCopy(text);
  return (
    <>
      <button
        type="button"
        className={`${className}${state === "copied" ? " is-copied" : ""}`}
        onClick={copy}
        title={text}
        aria-label={state === "copied" ? t.copy.copiedAria(text) : t.copy.actionAria(label, text)}
      >
        {icon && (
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h8" />
          </svg>
        )}
        {state === "copied" ? t.copy.copied : label}
      </button>
      {state === "manual" && <ManualCopy text={text} />}
    </>
  );
}

/** Monospace command with a copy button on the right. */
export function CommandBlock({ command, label = t.copy.copy, primary = false }: { command: string; label?: string; primary?: boolean }) {
  const { state, copy } = useCopy(command);
  return (
    <div>
      <div className="cmd">
        <code>{command}</code>
        <button
          type="button"
          className={`cmd-copy${primary ? " primary" : ""}${state === "copied" ? " is-copied" : ""}`}
          onClick={copy}
          aria-label={state === "copied" ? t.copy.copiedAria(command) : t.copy.actionAria(label, command)}
        >
          {state === "copied" ? t.copy.copied : label}
        </button>
      </div>
      {state === "manual" && <ManualCopy text={command} />}
    </div>
  );
}
