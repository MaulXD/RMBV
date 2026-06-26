import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";

function getServiceAccount() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (key) return JSON.parse(key);

  return {
    projectId: "rmbv-54998",
    clientEmail: "firebase-adminsdk-fbsvc@rmbv-54998.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
}

function getAppInstance() {
  if (getApps().length > 0) return getApp();
  return initializeApp({ credential: cert(getServiceAccount()) });
}

export async function sendPushToTokens(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<{ success: number; failure: number; failedTokens: string[] }> {
  if (tokens.length === 0) return { success: 0, failure: 0, failedTokens: [] };

  const app = getAppInstance();
  const messaging = getMessaging(app);

  const message: MulticastMessage = {
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    android: {
      priority: "high",
      notification: {
        channelId: "chamados",
        sound: "default",
        priority: "high",
        visibility: "public",
      },
    },
  };

  const result = await messaging.sendEachForMulticast(message);

  const failedTokens: string[] = [];
  result.responses.forEach((r, i) => {
    const code = r.error?.code;
    if (!r.success && (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token")) {
      failedTokens.push(tokens[i]);
    }
  });

  return { success: result.successCount, failure: result.failureCount, failedTokens };
}
