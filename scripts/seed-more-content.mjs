/**
 * Seed extra published news + gossip into Firestore DB `fmheart`.
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
    type: "news",
    title: "කාලගුණ අනතුරු ඇඟවීමක් — බස්නාහිර පළාතට තද වැසි බලාපොරොත්තු",
    slug: "weather-warning-western",
    category: "කාලගුණය",
    excerpt: "කාලගුණ විද්‍යා දෙපාර්තමේන්තුව බස්නාහිර පළාතට තද වැසි අනතුරු ඇඟවීමක් නිකුත් කරයි.",
    body: "කාලගුණ විද්‍යා දෙපාර්තමේන්තුව අද බස්නාහිර පළාත ඇතුළු ප්‍රදේශ කිහිපයකට තද වැසි ඇතිවිය හැකි බවට අනතුරු ඇඟවීමක් නිකුත් කර ඇත.\n\nප්‍රදේශවාසීන්ට අනවශ්‍ය ගමන් බිමන් අවම කරන ලෙසත්, ගංගා ඉවුරු අසල සිටීමෙන් වැළකී සිටින ලෙසත් ඉල්ලා ඇත.\n\nFM Heart News — තත්ත්වය යාවත්කාලීනව දන්වන්නෙමු.",
    coverImage:
      "https://images.unsplash.com/photo-1504608524841-42fe6f032b64?w=1200&q=80",
  },
  {
    type: "news",
    title: "තරුණ ව්‍යවසායකයින් සඳහා නව ඩිජිටල් පුහුණු වැඩසටහනක්",
    slug: "youth-digital-training",
    category: "ව්‍යාපාර",
    excerpt: "තරුණයන්ට digital skills ලබා දෙන නව පුහුණු වැඩසටහනක් ආරම්භ වේ.",
    body: "තරුණ ව්‍යවසායකයින් සහ content creators සඳහා නව ඩිජිටල් පුහුණු වැඩසටහනක් ලබන මාසයේ ආරම්භ වීමට නියමිතය.\n\nමෙහිදී social media, podcasting සහ basic video production පිළිබඳ පුහුණුව ලැබේ.\n\nවැඩි විස්තර සඳහා The Heart Academy සමඟ සම්බන්ධ වන්න.",
    coverImage:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80",
  },
  {
    type: "news",
    title: "ශ්‍රී ලංකා ක්‍රිකට් — තරගාවලියට පෙර පුහුණු සැසිය අවසන්",
    slug: "cricket-training-camp",
    category: "ක්‍රීඩා",
    excerpt: "ජාතික කණ්ඩායම ඉදිරි තරගාවලියට පෙර අවසන් පුහුණු සැසිය සම්පූර්ණ කරයි.",
    body: "ශ්‍රී ලංකා ජාතික ක්‍රිකට් කණ්ඩායම ඉදිරි තරගාවලියට පෙර අවසන් පුහුණු සැසිය අවසන් කර ඇත.\n\nකණ්ඩායම් තෝරාගැනීම ඉදිරි දින කිහිපයේදී නිකුත් වනු ඇතැයි බලාපොරොත්තු වේ.\n\nFM Heart Sports desk වාර්තා කරයි.",
    coverImage:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200&q=80",
  },
  {
    type: "gossip",
    title: "රාත්‍රී සංගීත ප්‍රසංගයේදී රසිකයන්ගේ විශේෂ ප්‍රතිචාරය",
    slug: "night-concert-crowd",
    category: "Music",
    excerpt: "කොළඹ රාත්‍රී ප්‍රසංගයකදී රසිකයන්ගේ උනන්දුව ඉහළ ගිය බව වාර්තා වේ.",
    body: "කොළඹ පැවති රාත්‍රී සංගීත ප්‍රසංගයකදී රසිකයන්ගේ ප්‍රතිචාරය ඉතා උණුසුම් වූ බව ප්‍රේක්ෂකයන් පවසයි.\n\nකලාකරුවන් කිහිප දෙනෙකුගේ surprise performance එකක්ද වේදිකාවේ දක්නට ලැබුණි.\n\nFM Heart Gossip — entertainment pulse.",
    coverImage:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
  },
  {
    type: "gossip",
    title: "නව YouTube channel එකකින් තරුණ creator කෙනෙක් viral වෙයි",
    slug: "youtube-creator-viral",
    category: "YouTube",
    excerpt: "සති දෙකක් තුළ subscribers ලක්ෂ ගණනක් එකතු කළ තරුණ creator කතාබහට ලක්වෙයි.",
    body: "තරුණ YouTube creator කෙනෙකුගේ නව channel එක ඉක්මනින්ම අවධානයට ලක්ව ඇත.\n\nComedy සහ lifestyle content මිශ්‍ර කරන ඔහුගේ style එක රසිකයන් අතර ජනප්‍රිය වී තිබේ.\n\nවැඩි විස්තර ඉදිරියේදී.",
    coverImage:
      "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&q=80",
  },
  {
    type: "gossip",
    title: "Fashion week එකේදී දේශීය නිර්මාණකරුවන්ගේ අවධානය",
    slug: "fashion-week-local-designers",
    category: "Fashion",
    excerpt: "දේශීය නිර්මාණකරුවන්ගේ එකතුවන් fashion week එකේදී අවධානයට ලක්වෙයි.",
    body: "මෑතකදී පැවති fashion week උත්සවයේදී දේශීය නිර්මාණකරුවන්ගේ රෙදිපිළි එකතුවන් රසිකයන්ගේ සහ මාධ්‍යයේ අවධානයට ලක්ව ඇත.\n\nතරුණ models සහ influencers කිහිප දෙනෙකුද මෙම අවස්ථාවට සහභාගී වූහ.",
    coverImage:
      "https://images.unsplash.com/photo-1558171813-4c0880cf7374?w=1200&q=80",
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
      console.log("skip:", item.slug);
      skipped += 1;
      continue;
    }

    await db.collection("articles").add({
      type: item.type,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      body: item.body,
      category: item.category,
      coverImage: item.coverImage,
      author: "FM Heart",
      status: "published",
      tags: [item.type, item.category.toLowerCase()],
      readingTimeMin: 2,
      views: 0,
      seoTitle: item.title,
      seoDescription: item.excerpt,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    });
    console.log(`added (${item.type}):`, item.slug);
    added += 1;
  }

  console.log(`Done. added=${added} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
