import assert from "node:assert/strict";
import { guideRowSchema, guideSchema, repairGuideInput, slugify } from "../lib/guide";

const valid = {
  app: { name: "Spotify", website: "https://developer.spotify.com" },
  difficulty: { level: 2, why: "Self-serve app creation; development mode caps users." },
  time: { setup: "30 minutes", approvalWait: null },
  requirements: ["A Spotify account"],
  steps: [
    { title: "Sign up", detail: "Create a developer account.", agentCompatible: false },
    { title: "Create the app", detail: "Open the dashboard and click Create app.", agentCompatible: true },
  ],
  issues: [{ problem: "Users beyond the cap see 403", fix: "Request an extension." }],
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

const unclosedTime = JSON.stringify(valid).replace('null},"requirements"', 'null,"requirements"').replace(/}$/, "");
assert.throws(() => JSON.parse(unclosedTime), "fixture is broken JSON");
assert.deepEqual(JSON.parse(repairGuideInput(unclosedTime) ?? "null"), valid, "unclosed time object repaired");

assert.ok(
  !guideSchema.safeParse({ ...valid, issues: Array(6).fill(valid.issues[0]) }).success,
  "more than 5 issues rejected",
);

const legacy = guideRowSchema.parse({
  slug: "spotify",
  app_name: "Spotify",
  guide: {
    ...valid,
    issues: undefined,
    steps: [{ title: "Create the app", detail: "Open the dashboard." }],
    agentHelp: { canDo: ["x"], youMustDo: ["y"] },
    blockers: Array(7).fill({ problem: "p", fix: "f" }),
  },
});
assert.equal(legacy.guide.steps[0].agentCompatible, false, "legacy step defaults to not agent compatible");
assert.equal(legacy.guide.issues.length, 5, "legacy blockers become at most 5 issues");
assert.ok(!("agentHelp" in legacy.guide), "legacy agentHelp dropped");
assert.equal(repairGuideInput('{"app": {"name": "X"'), null, "unrepairable input returns null");

console.log("smoke: all assertions passed");
