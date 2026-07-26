/**
 * Fix articles that used full Sinhala titles as slugs → short news-{id} slugs
 */
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "fm-heart-eghluo";
const DATABASE_ID = "fmheart";
const KEY_PATH = resolve(
  process.env.USERPROFILE || "",
  "Downloads",
  "fm-heart-eghluo-firebase-adminsdk-d7cpw-c6b5165fec.json",
);

function needsFix(slug = "") {
  return (
    !slug ||
    slug.length > 80 ||
    /\s/.test(slug) ||
    /[^\u0000-\u007f]/.test(slug)
  );
}

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: cert(KEY_PATH), projectId: PROJECT_ID });
  }
  const db = getFirestore(undefined, DATABASE_ID);
  const snap = await db.collection("articles").get();
  console.log("Articles:", snap.size);

  for (const doc of snap.docs) {
    const data = doc.data();
    if (!needsFix(data.slug)) {
      console.log("OK:", data.slug);
      continue;
    }
    const newSlug = `news-${doc.id.slice(0, 8).toLowerCase()}`;
    await doc.ref.set(
      { slug: newSlug, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    console.log(`Fixed: "${data.title?.slice(0, 40)}..." → /news/${newSlug}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
