/** Verify Firebase ID token without firebase-admin/auth (jose ESM issues on Vercel). */
export async function verifyFirebaseIdToken(
  token: string,
): Promise<{ email?: string } | null> {
  if (!token) return null;

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();

  // Preferred: Identity Toolkit lookup (handles long JWTs; no URL length issues).
  if (apiKey) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
          cache: "no-store",
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          users?: Array<{ email?: string; localId?: string }>;
        };
        const email = data.users?.[0]?.email;
        if (email) return { email };
      }
    } catch {
      /* fall through */
    }
  }

  if (!projectId) return null;

  // Fallback: tokeninfo via POST body, then GET.
  try {
    let res = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: token }),
      cache: "no-store",
    });
    if (!res.ok) {
      res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
    }
    if (!res.ok) return null;

    const data = (await res.json()) as {
      email?: string;
      aud?: string | string[];
      exp?: string | number;
      error?: string;
    };
    if (data.error) return null;

    const audiences = Array.isArray(data.aud)
      ? data.aud
      : data.aud
        ? [data.aud]
        : [];
    if (!audiences.includes(projectId)) return null;

    const expMs =
      typeof data.exp === "string"
        ? Number(data.exp) * 1000
        : typeof data.exp === "number"
          ? data.exp * 1000
          : 0;
    if (expMs && expMs < Date.now()) return null;

    return { email: data.email };
  } catch {
    return null;
  }
}
