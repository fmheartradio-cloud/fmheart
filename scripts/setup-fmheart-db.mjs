/**
 * Deploy rules to Native DB `fmheart` + seed a test article if empty.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { GoogleAuth } from "google-auth-library";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "fm-heart-eghluo";
const DATABASE_ID = "fmheart";
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
  const token = (await client.getAccessToken()).token;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

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

  const releaseId = `cloud.firestore/${DATABASE_ID}`;
  const releaseName = `projects/${PROJECT_ID}/releases/${releaseId}`;

  // Try PATCH first, then POST
  let releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/${releaseName}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        release: { name: releaseName, rulesetName },
      }),
    },
  );
  if (!releaseRes.ok) {
    releaseRes = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ name: releaseName, rulesetName }),
      },
    );
  }
  const released = await releaseRes.json();
  if (!releaseRes.ok) {
    throw new Error(`Release failed: ${JSON.stringify(released)}`);
  }
  console.log("Rules released for DB:", DATABASE_ID);
}

async function seedIfEmpty() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(KEY_PATH),
      projectId: PROJECT_ID,
    });
  }
  const db = getFirestore(undefined, DATABASE_ID);
  const snap = await db.collection("articles").get();
  console.log(`Articles in ${DATABASE_ID}:`, snap.size);

  if (snap.empty) {
    const now = new Date().toISOString();
    const ref = await db.collection("articles").add({
      type: "news",
      title: "FM Heart Digital Platform ආරම්භය",
      slug: "fm-heart-launch",
      excerpt: "ශ්‍රී ලංකාවේ තරුණ හදවතේ digital media platform එක ආරම්භ වේ.",
      body: "FM Heart — Live Radio, News, Gossip සහ Entertainment එකම තැනක.\n\nමෙය CMS එකෙන් publish වූ පළමු article එකයි.",
      category: "දේශීය",
      coverImage:
        "https://images.unsplash.com/photo-1478737270239-2f02bbce45b9?w=1200&q=80",
      author: "FM Heart Desk",
      status: "published",
      tags: ["fmheart", "launch"],
      readingTimeMin: 1,
      views: 1,
      seoTitle: "FM Heart Digital Platform ආරම්භය",
      seoDescription: "FM Heart digital media platform launch",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    });
    console.log("Seeded article:", ref.id);
  } else {
    for (const doc of snap.docs) {
      await doc.ref.set(
        {
          status: "published",
          publishedAt: doc.data().publishedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      console.log("Published:", doc.id, doc.data().title);
    }
  }
}

async function main() {
  try {
    await deployRules();
  } catch (e) {
    console.error("Rules:", e instanceof Error ? e.message : e);
    console.log(
      "\nRules console එකේ paste කරන්න (database = fmheart):\n" +
        "https://console.firebase.google.com/project/fm-heart-eghluo/firestore/databases/fmheart/rules",
    );
  }
  try {
    await seedIfEmpty();
  } catch (e) {
    console.error("Seed:", e instanceof Error ? e.message : e);
  }
}

main();
