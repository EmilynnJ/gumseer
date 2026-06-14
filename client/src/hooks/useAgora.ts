import { useState, useRef, useCallback, useEffect } from "react";
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import AgoraRTM, { RtmClient, RtmChannel, RtmMessage } from "agora-rtm-sdk";
import { useApi } from "./useApi";

interface AgoraState {
  join: () => Promise<void>;
  leave: () => Promise<void>;
  isJoined: boolean;
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  remoteUsers: Map<number, any>;
  messages: Array<{ userId: number; text: string; timestamp: number }>;
  sendMessage: (text: string) => void;
  mute: () => void;
  unmute: () => void;
  toggleCamera: () => void;
  isMuted: boolean;
  isCameraOn: boolean;
  error: string | null;
  isConnecting: boolean;
}

export function useAgora(readingId: number, readingType: "chat" | "voice" | "video" | undefined, userId: number): AgoraState {
  const api = useApi();
  const rtcClientRef = useRef<IAgoraRTCClient | null>(null);
  const rtmClientRef = useRef<RtmClient | null>(null);
  const rtmChannelRef = useRef<RtmChannel | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [localAudioTrack, setLocalAudio] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideo] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<Map<number, any>>(new Map());
  const [messages, setMessages] = useState<Array<{ userId: number; text: string; timestamp: number }>>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const join = useCallback(async () => {
    if (!readingType || readingId === 0) return;
    setIsConnecting(true); setError(null);
    try {
      const res = await api.post(`/api/readings/${readingId}/agora-token`);
      const { channelName, token, appId } = res.data;

      if (readingType === "chat") {
        const client = AgoraRTM.createInstance(appId);
        rtmClientRef.current = client;
        await new Promise<void>((resolve, reject) => {
          client.on("ConnectionStateChanged", (state: string, reason: string) => {
            if (state === "DISCONNECTED") reject(new Error("RTM disconnected: " + reason));
          });
          client.login({ uid: String(userId), token }).then(() => resolve()).catch(reject);
        });
        const channel = client.createChannel(channelName);
        rtmChannelRef.current = channel;
        channel.on("ChannelMessage", (msg: RtmMessage, senderId: string) => {
          if (msg.text) {
            setMessages(prev => [...prev, { userId: Number(senderId), text: msg.text as string, timestamp: Date.now() }]);
          }
        });
        await channel.join();
      } else {
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        rtcClientRef.current = client;

        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          setRemoteUsers(prev => {
            const next = new Map(prev);
            const existing = next.get(user.uid as number) || {};
            if (mediaType === "audio") existing.audio = user.audioTrack;
            if (mediaType === "video") existing.video = user.videoTrack;
            next.set(user.uid as number, existing);
            return next;
          });
          user.audioTrack?.play();
          user.videoTrack?.play();
        });

        client.on("user-unpublished", (user) => {
          setRemoteUsers(prev => { const next = new Map(prev); next.delete(user.uid as number); return next; });
        });

        await client.join(appId, channelName, token, userId);

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalAudio(audioTrack);
        await client.publish([audioTrack]);

        if (readingType === "video") {
          const videoTrack = await AgoraRTC.createCameraVideoTrack();
          setLocalVideo(videoTrack); setIsCameraOn(true);
          await client.publish([videoTrack]);
        }
      }

      setIsJoined(true);
      try { await api.post(`/api/readings/${readingId}/start`); } catch {}
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      console.error("Agora join error:", err);
    } finally { setIsConnecting(false); }
  }, [readingId, readingType, userId, api]);

  const leave = useCallback(async () => {
    try { await api.post(`/api/readings/${readingId}/end`); } catch {}
    localAudioTrack?.close();
    localVideoTrack?.close();
    if (rtcClientRef.current) { await rtcClientRef.current.leave(); rtcClientRef.current = null; }
    if (rtmChannelRef.current) { await rtmChannelRef.current.leave(); rtmChannelRef.current = null; }
    if (rtmClientRef.current) { await rtmClientRef.current.logout(); rtmClientRef.current = null; }
    setIsJoined(false); setLocalAudio(null); setLocalVideo(null); setRemoteUsers(new Map());
  }, [readingId, api, localAudioTrack, localVideoTrack]);

  const sendMessage = useCallback((text: string) => {
    if (rtmChannelRef.current) {
      rtmChannelRef.current.sendMessage({ text });
      setMessages(prev => [...prev, { userId, text, timestamp: Date.now() }]);
    }
  }, [userId]);

  const mute = useCallback(() => { localAudioTrack?.setEnabled(false); setIsMuted(true); }, [localAudioTrack]);
  const unmute = useCallback(() => { localAudioTrack?.setEnabled(true); setIsMuted(false); }, [localAudioTrack]);
  const toggleCamera = useCallback(() => {
    if (localVideoTrack) { const next = !isCameraOn; localVideoTrack.setEnabled(next); setIsCameraOn(next); }
  }, [localVideoTrack, isCameraOn]);

  useEffect(() => { return () => { leave(); }; }, []);

  return { join, leave, isJoined, localAudioTrack, localVideoTrack, remoteUsers, messages, sendMessage, mute, unmute, toggleCamera, isMuted, isCameraOn, error, isConnecting };
}
