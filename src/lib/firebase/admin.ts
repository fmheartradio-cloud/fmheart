import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const FIRESTORE_DB_ID =
  process.env.FIRESTORE_DB_ID ||
  process.env.NEXT_PUBLIC_FIRESTORE_DB_ID ||
  "fmheart";

let app: App | undefined;
let db: Firestore | undefined;

function loadServiceAccount():
  | { projectId?: string; clientEmail: string; privateKey: string }
  | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    };
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function getAdminApp(): App | null {
  const sa = loadServiceAccount();
  if (!sa) return null;

  if (!getApps().length) {
    app = initializeApp({
      credential: cert({
        projectId: sa.projectId,
        clientEmail: sa.clientEmail,
        privateKey: sa.privateKey,
      }),
      projectId: sa.projectId,
    });
  } else {
    app = getApps()[0];
  }
  return app;
}

export function getAdminDb(): Firestore | null {
  if (db) return db;
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  db = getFirestore(adminApp, FIRESTORE_DB_ID);
  return db;
}

export function isAdminSdkConfigured(): boolean {
  return loadServiceAccount() !== null;
}
