/**
 * Create a Native Firestore database (Datastore-mode default cannot serve Firebase Web SDK).
 */
import { resolve } from "path";
import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = "fm-heart-eghluo";
const DATABASE_ID = "fmheart";
const LOCATION = "asia-south1";
const KEY_PATH = resolve(
  process.env.USERPROFILE || "",
  "Downloads",
  "fm-heart-eghluo-firebase-adminsdk-d7cpw-c6b5165fec.json",
);

async function main() {
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

  // List existing databases
  const listRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases`,
    { headers },
  );
  const listed = await listRes.json();
  console.log("Existing databases:", JSON.stringify(listed, null, 2));

  const createRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases?databaseId=${DATABASE_ID}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        locationId: LOCATION,
        type: "FIRESTORE_NATIVE",
        concurrencyMode: "PESSIMISTIC",
      }),
    },
  );
  const created = await createRes.json();
  console.log("Create status:", createRes.status);
  console.log(JSON.stringify(created, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
