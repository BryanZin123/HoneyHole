import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const sources = [
  [
    "FGC effective date",
    "https://fgc.ca.gov/Regulations/2021-New-and-Proposed",
    /Effective Date of Regulation:\s*June 1, 2022/i,
  ],
  [
    "CDFW current grunion",
    "https://wildlife.ca.gov/Fishing/Ocean/Grunion",
    /daily bag and possession limit for grunion is 30 fish/i,
  ],
  [
    "CDFW in-season index",
    "https://wildlife.ca.gov/Fishing/Ocean/Regulations/Inseason",
    /In-Season Ocean Fishing Regulation Changes/i,
  ],
];
for (const [name, url, expected] of sources) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, name);
  const content = await response.text();
  const normalized = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  assert(
    expected.test(normalized),
    `${name}: expected reviewed text missing; manual review required`,
  );
  if (name === "CDFW current grunion")
    assert(/closed for April, May, and June/i.test(normalized));
  console.log(
    JSON.stringify({
      name,
      url,
      retrievedAt: new Date().toISOString(),
      httpStatus: response.status,
      sha256: createHash("sha256").update(content).digest("hex"),
      expectedTextPresent: true,
    }),
  );
}
const url =
  "https://www.arcgis.com/sharing/rest/content/items/4a641ba6d51c44fdb734754d83d7eb43?f=json";
const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200);
const item = await response.json();
assert(/Commercial uses.*approved/i.test(item.licenseInfo));
console.log(
  JSON.stringify({
    name: "CSP terms",
    url,
    owner: item.owner,
    publisher: item.accessInformation,
    commercialApprovalRequired: true,
    reviewedAt: new Date().toISOString(),
  }),
);
console.log(
  "PASS source availability and reviewed text checks. This is not automated legal interpretation or a freshness renewal.",
);
