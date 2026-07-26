/**
 * One-shot: publish Firestore rules + set all articles to published.
 * Uses local service account JSON (never commit that file).
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { GoogleAuth } from "google-auth-library";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "fm-heart-eghluo";
const KEY_PATH = resolve(
  process.env.USERPROFILE || "",
  "Downloads",
  "fm-heart-eghluo-firebase-adminsdk-d7cpw-c6b5165fec.json",
);
const RULES_PATH = resolve("firestore.rules");

async function deployRules() {
  const rulesContent = readFileSync(RULES_PATH, "utf8");
  const auth = new GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("No access token from service account");

  const headers = {
    Authorization: `Bearer ${token.token}`,
    "Content-Type": "application/json",
  };

  // Create ruleset
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: {
          files: [{ name: "firestore.rules", content: rulesContent }],
        },
      }),
    },
  );
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Ruleset create failed: ${JSON.stringify(created)}`);
  }
  const rulesetName = created.name;
  console.log("Ruleset:", rulesetName);

  // Release as cloud.firestore
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName,
        },
      }),
    },
  );

  // If release doesn't exist yet, create it
  if (releaseRes.status === 404 || releaseRes.status === 400) {
    const postRes = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName,
        }),
      },
    );
    const posted = await postRes.json();
    if (!postRes.ok) {
      throw new Error(`Release create failed: ${JSON.stringify(posted)}`);
    }
    console.log("Rules released (create): cloud.firestore");
    return;
  }

  const released = await releaseRes.json();
  if (!releaseRes.ok) {
    // try PUT-style via create after delete isn't needed — show error
    throw new Error(`Release update failed: ${JSON.stringify(released)}`);
  }
  console.log("Rules released (update): cloud.firestore");
}

async function publishAllArticles() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(KEY_PATH),
      projectId: PROJECT_ID,
    });
  }
  const db = getFirestore();
  const snap = await db.collection("articles").get();
  console.log(`Articles found: ${snap.size}`);

  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const patch = {
      status: "published",
      updatedAt: new Date().toISOString(),
      publishedAt: data.publishedAt || new Date().toISOString(),
    };
    await doc.ref.set(patch, { merge: true });
    updated += 1;
    console.log(`Published: ${doc.id} — ${data.title || "(no title)"}`);
  }
  console.log(`Updated ${updated} article(s) to published`);
}

async function main() {
  console.log("Using key:", KEY_PATH);
  try {
    await deployRules();
  } catch (err) {
    console.error("Rules deploy error:", err instanceof Error ? err.message : err);
  }
  try {
    await publishAllArticles();
  } catch (err) {
    console.error("Articles publish error:", err instanceof Error ? err.message : err);
  }
}

main();
