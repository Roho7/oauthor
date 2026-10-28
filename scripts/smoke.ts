import assert from "node:assert/strict";
import { guideSchema, slugify } from "../lib/guide";

const valid = {
  app: { name: "Spotify", website: "https://developer.spotify.com" },
  difficulty: { level: 2, why: "Self-serve app creation; development mode caps users." },
  time: { setup: "30 minutes", approvalWait: null },
  requirements: ["A Spotify account"],
  agentHelp: { canDo: ["Draft the redirect URI list"], youMustDo: ["Accept the developer terms"] },
  steps: [{ title: "Create the app", detail: "Open the dashboard and click Create app." }],
  blockers: [{ problem: "Users beyond the cap see 403", fix: "Request an extension." }],
  references: [{ title: "Apps", url: "https://developer.spotify.com/documentation/web-api/concepts/apps" }],
};

const parsed = guideSchema.safeParse(valid);
assert.ok(parsed.success, "valid guide parses");
assert.equal(parsed.data.difficulty.level, 2);
assert.equal(parsed.data.time.approvalWait, null);

const badLevel = guideSchema.safeParse({ ...valid, difficulty: { level: 6, why: "x" } });
assert.ok(!badLevel.success, "difficulty level 6 rejected");

assert.ok(
  !guideSchema.safeParse({ ...valid, steps: undefined }).success,
  "guide without steps rejected",
);

assert.ok(
  !guideSchema.safeParse({ ...valid, references: [{ title: "Docs" }] }).success,
  "reference without url rejected",
);

assert.equal(slugify("Spotify"), "spotify");
assert.equal(slugify("Meta Ads"), "meta-ads");
assert.equal(slugify("Twitter/X"), "twitter-x");
assert.equal(slugify("  DocuSign! "), "docusign");
assert.equal(slugify("Zoho CRM (EU)"), "zoho-crm-eu");
assert.equal(slugify("Café"), "cafe");
assert.equal(slugify("spotify"), "spotify");
assert.equal(slugify("???"), "");

console.log("smoke: all assertions passed");
