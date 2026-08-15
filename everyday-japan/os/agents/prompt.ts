import fs from "node:fs";
import { resolvePath } from "../store/fs";

export interface PromptDoc {
  version: string;
  body: string;
  path: string;
}

/** Parse `version: x.y.z` from prompt front matter or first lines */
export function loadPrompt(relativePath: string): PromptDoc {
  const full = resolvePath(relativePath);
  if (!fs.existsSync(full)) {
    return { version: "0.0.0", body: "", path: relativePath };
  }
  const raw = fs.readFileSync(full, "utf8");
  let version = "0.0.0";
  let body = raw;

  if (raw.startsWith("---")) {
    const end = raw.indexOf("---", 3);
    if (end !== -1) {
      const fm = raw.slice(3, end);
      const m = fm.match(/version:\s*([0-9.]+)/);
      if (m) version = m[1];
      body = raw.slice(end + 3).trim();
    }
  } else {
    const m = raw.match(/^version:\s*([0-9.]+)/m);
    if (m) version = m[1];
  }

  return { version, body, path: relativePath };
}
