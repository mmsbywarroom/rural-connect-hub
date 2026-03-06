import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

export type IncomingCallPayload = {
  type: "incoming-call";
  callId: string;
  groupId: string;
  callType: "audio" | "video";
  callerId: string;
  callerName: string;
};

export type CallEndedPayload = {
  type: "call-ended";
  callId: string;
};

export type SignalPayload =
  | { type: "offer"; callId: string; fromUserId: string; toUserId: string; sdp: any }
  | { type: "answer"; callId: string; fromUserId: string; toUserId: string; sdp: any }
  | { type: "ice-candidate"; callId: string; fromUserId: string; toUserId: string; candidate: any };

const connectionsByUser = new Map<string, Set<WebSocket>>();

export function attachCallWebSocket(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/calls" });

  wss.on("connection", (ws: WebSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const appUserId = url.searchParams.get("userId");
    if (!appUserId) {
      ws.close(4000, "Missing userId");
      return;
    }
    let set = connectionsByUser.get(appUserId);
    if (!set) {
      set = new Set();
      connectionsByUser.set(appUserId, set);
    }
    set.add(ws);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as SignalPayload;
        if (msg.type === "offer" || msg.type === "answer" || msg.type === "ice-candidate") {
          const targetSet = connectionsByUser.get(msg.toUserId);
          if (targetSet) {
            const payload = JSON.stringify(msg);
            for (const targetWs of Array.from(targetSet)) {
              if (targetWs.readyState === 1) {
                targetWs.send(payload);
              }
            }
          }
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      set!.delete(ws);
      if (set!.size === 0) connectionsByUser.delete(appUserId);
    });
    ws.on("error", () => {
      set!.delete(ws);
      if (set!.size === 0) connectionsByUser.delete(appUserId);
    });
  });
}

/** Notify specific app users (e.g. all group members except caller) about incoming call. */
export function notifyIncomingCall(appUserIds: string[], payload: IncomingCallPayload): void {
  const data = JSON.stringify(payload);
  for (const userId of appUserIds) {
    const set = connectionsByUser.get(userId);
    if (set) {
      for (const ws of Array.from(set)) {
        if (ws.readyState === 1) ws.send(data);
      }
    }
  }
}

/** Notify participants that call has ended. */
export function notifyCallEnded(appUserIds: string[], payload: CallEndedPayload): void {
  const data = JSON.stringify(payload);
  for (const userId of appUserIds) {
    const set = connectionsByUser.get(userId);
    if (set) {
      for (const ws of Array.from(set)) {
        if (ws.readyState === 1) ws.send(data);
      }
    }
  }
}
