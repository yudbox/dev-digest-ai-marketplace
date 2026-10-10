import type { Kind } from "../lib/types";

export function KindBadge({ kind, small = false }: { kind: Kind; small?: boolean }) {
  return <span className={`badge badge-${kind}${small ? " badge-sm" : ""}`}>{kind}</span>;
}
