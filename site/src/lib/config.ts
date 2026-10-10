// Values shared by the onboarding page, the home page and the cards. They
// mirror README.md (AC-30) — change both together.
export const MARKETPLACE = "dev-digest-ai-marketplace";
export const REPO = "yudbox/dev-digest-ai-marketplace";
export const REPO_URL = `https://github.com/${REPO}`;
export const CONTRIBUTING_URL = `${REPO_URL}/blob/main/CONTRIBUTING.md`;
export const ADD_MARKETPLACE = `/plugin marketplace add ${REPO}`;

export function installCommand(plugin: string): string {
  return `/plugin install ${plugin}@${MARKETPLACE}`;
}
