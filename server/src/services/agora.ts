import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { RtmTokenBuilder, RtmRole } from "agora-access-token";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

export function generateRtcToken(channelName: string, uid: number): string {
  const expireTime = Math.floor(Date.now() / 1000) + 3600;
  return RtcTokenBuilder.buildTokenWithUid(env.AGORA_APP_ID, env.AGORA_APP_CERTIFICATE, channelName, uid, RtcRole.PUBLISHER, expireTime, expireTime);
}

export function generateRtmToken(userId: string): string {
  const expireTime = Math.floor(Date.now() / 1000) + 3600;
  return RtmTokenBuilder.buildToken(env.AGORA_APP_ID, env.AGORA_APP_CERTIFICATE, userId, RtmRole.Rtm_User, expireTime);
}

export function generateReadingToken(readingId: number, userId: number, type: "chat" | "voice" | "video"): { channelName: string; token: string; appId: string } {
  const channelName = `reading_${readingId}`;
  let token: string;
  if (type === "chat") {
    token = generateRtmToken(String(userId));
  } else {
    token = generateRtcToken(channelName, userId);
  }
  logger.info({ readingId, userId, type, channelName }, "Agora token generated");
  return { channelName, token, appId: env.AGORA_APP_ID };
}
