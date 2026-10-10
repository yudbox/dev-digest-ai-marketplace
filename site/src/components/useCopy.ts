import { useCallback, useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "manual";

/** Copies text; "Copied ✓" for 2 s (AC-13). Without the Clipboard API (or if
 * it rejects) the caller shows the text in a pre-selected field (AC-15). */
export function useCopy(text: string) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    clearTimeout(timer.current);
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) {
      setState("manual");
      return;
    }
    try {
      await clipboard.writeText(text);
      setState("copied");
      timer.current = setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("manual");
    }
  }, [text]);

  return { state, copy };
}
