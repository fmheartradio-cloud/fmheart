/**
 * Seed sample published gossip articles into Firestore DB `fmheart`.
 * Skips slugs that already exist.
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

const samples = [
  {
    title: "ජනප්‍රිය නිළියගේ නව චිත්‍රපටයේ පළමු ඡායාරූප",
    slug: "actress-new-film",
    category: "Film",
    excerpt: "නව චිත්‍රපටයේ behind-the-scenes ඡායාරූප සමාජ මාධ්‍ය තුළ කතාබහට ලක්වෙයි.",
    body: "ජනප්‍රිය නිළියගේ නව චිත්‍රපට ව්‍යාපෘතියේ පළමු ඡායාරූප නිකුත් වී තිබේ.\n\nරසිකයන් අතර මෙම තොරතුරු ඉක්මනින් පැතිර ගිය අතර, official trailer එක ඉදිරි සතියේ බලාපොරොත්තු වේ.\n\nFM Heart Gossip — entertainment updates ඔබටම.",
    coverImage:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&q=80",
  },
  {
    title: "ටෙලි නාට්‍ය තරුවගේ අනපේක්ෂිත ප්‍රකාශය",
    slug: "teledrama-star-statement",
    category: "Tele Drama",
    excerpt: "ප්‍රසිද්ධ ටෙලි නාට්‍ය නළුවා සමාජ මාධ්‍ය හරහා අනපේක්ෂිත ප්‍රකාශයක් කරයි.",
    body: "ටෙලි නාට්‍ය තරුවක් විසින් සිය ඉදිරි සැලසුම් ගැන අනපේක්ෂිත ප්‍රකාශයක් සිදු කර ඇත.\n\nරසික ප්‍රතිචාර මිශ්‍ර වී ඇති අතර, නිෂ්පාදන සමාගම තවමත් නිල ප්‍රතිචාරයක් නොදී ඇත.\n\nවැඩි විස්තර සඳහා FM Heart Gossip අනුගමනය කරන්න.",
    coverImage:
      "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1200&q=80",
  },
  {
    title: "TikTok තරුවගේ වයිරල් නර්තනය මිලියන ගණන් views",
    slug: "tiktok-viral-dance",
    category: "TikTok",
    excerpt: "තරුණ TikTok creator කෙනෙකුගේ නර්තන වීඩියෝව ලොව පුරා වයිරල් වෙයි.",
    body: "ශ්‍රී ලාංකික TikTok තරුවකගේ නවතම නර්තන clip එක පැය කිහිපයකින් මිලියන ගණන් views ලබා ඇත.\n\nTrend එකට බොහෝ creators join වී ඇති අතර, original sound එක charts වල ඉහළට යමින් පවතී.",
    coverImage:
      "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&q=80",
  },
  {
    title: "සංගීත තරුවන්ගේ රාත්‍රී උත්සවයේ රහස් ඡායාරූප",
    slug: "celebrity-night-out",
    category: "Celebrities",
    excerpt: "කොළඹ රාත්‍රී උත්සවයකදී සංගීත තරුවන්ගේ ඡායාරූප අන්තර්ජාලයට නිකුත් වේ.",
    body: "ප්‍රසිද්ධ සංගීත තරුවන් සහභාගී වූ රාත්‍රී උත්සවයක ඡායාරූප සමාජ ජාල තුළ බෙදාහැරී ඇත.\n\nඇතැම් ඡායාරූප තහවුරු නොවූ බවටත් වාර්තා වන අතර, FM Heart තහවුරු කළ තොරතුරු පමණක් පළ කරයි.",
    coverImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80",
  },
];

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(KEY_PATH),
      projectId: PROJECT_ID,
    });
  }

  const db = getFirestore(undefined, DATABASE_ID);
  const now = new Date().toISOString();
  let added = 0;
  let skipped = 0;

  for (const item of samples) {
    const existing = await db
      .collection("articles")
      .where("slug", "==", item.slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log("skip (exists):", item.slug);
      skipped += 1;
      continue;
    }

    await db.collection("articles").add({
      type: "gossip",
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      body: item.body,
      category: item.category,
      coverImage: item.coverImage,
      author: "FM Heart",
      status: "published",
      tags: ["gossip", item.category.toLowerCase()],
      readingTimeMin: 2,
      views: 0,
      seoTitle: item.title,
      seoDescription: item.excerpt,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    });
    console.log("added:", item.slug);
    added += 1;
  }

  console.log(`Done. added=${added} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
