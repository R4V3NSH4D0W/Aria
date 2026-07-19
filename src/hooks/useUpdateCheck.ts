import { useState, useEffect } from "react";

const REPO = "R4V3NSH4D0W/Aria";
const CURRENT_VERSION = "1.1.4";

function parseTag(tag: string): number[] {
  return tag.replace(/^v/i, "").split(".").map(Number);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseTag(latest);
  const c = parseTag(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const a = l[i] || 0;
    const b = c[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

export function useUpdateCheck() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${REPO}/releases/latest`,
          { headers: { Accept: "application/vnd.github.v3+json" } },
        );
        if (!res.ok) return;
        const data = await res.json();
        const tag: string = data.tag_name || "";
        if (cancelled) return;
        setLatestVersion(tag);
        if (tag && isNewer(tag, CURRENT_VERSION)) {
          setHasUpdate(true);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  return { hasUpdate, latestVersion, checking };
}
