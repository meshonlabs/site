/* Deploy-time build step: injects the Web3Forms access key into index.html.
 *
 * The key comes from the Vercel environment variable CONTACT_ACCESS_KEY and
 * is never stored in this repository. If the variable is missing, the form
 * automatically falls back to opening the visitor's mail app (mailto).
 */
import { readFileSync, writeFileSync } from "node:fs";

const PLACEHOLDER = "__CONTACT_ACCESS_KEY__";
const html = readFileSync("index.html", "utf8");
const key = process.env.CONTACT_ACCESS_KEY || "";

if (!html.includes(PLACEHOLDER)) {
  console.log("NOTE: placeholder not found in index.html — nothing injected.");
  process.exit(0);
}

writeFileSync("index.html", html.replace(PLACEHOLDER, key));

if (key) {
  console.log("Contact form: access key injected from environment.");
} else {
  console.log("WARNING: CONTACT_ACCESS_KEY not set — form will use the mailto fallback.");
}
