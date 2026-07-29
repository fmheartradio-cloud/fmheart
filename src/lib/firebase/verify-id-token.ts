/** Verify Firebase ID token via Google tokeninfo (avoids firebase-admin/auth on Vercel). */
export async function verifyFirebaseIdToken(
  token: string,
): Promise<{ email?: string } | null> {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return null;

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    email?: string;
    aud?: string;
    exp?: string;
  };
  if (data.aud !== projectId) return null;
  if (data.exp && Number(data.exp) * 1000 < Date.now()) return null;
  return { email: data.email };
}
