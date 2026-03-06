import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Send, Image as ImageIcon, Loader2, MoreVertical, Mic, MicOff, Reply, Trash2, Phone, Video, PhoneOff } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { AppUser } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

interface Group {
  id: string;
  name: string;
  memberCount: number;
}

interface ReplyTo {
  id: string;
  text: string | null;
  senderName: string;
}

interface Message {
  id: string;
  groupId: string;
  appUserId: string;
  text: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  replyToMessageId: string | null;
  replyTo: ReplyTo | null;
  deletedAt: string | null;
  deletedForEveryone: boolean;
  deletedForUserIds: string[];
  reactions: Record<string, string[]>;
  createdAt: string;
  senderName: string;
  senderPhoto: string | null;
}

type MediaViewer =
  | { type: "image"; url: string }
  | null;

function photoUrl(userId: string) {
  return `/api/app/user/${userId}/photo`;
}

interface GroupChatProps {
  user: AppUser;
  onBack: () => void;
}

export default function GroupChat({ user, onBack }: GroupChatProps) {
  const { language } = useTranslation();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [recording, setRecording] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callId: string; groupId: string; callType: "audio" | "video"; callerId: string; callerName: string } | null>(null);
  const [peerPickerType, setPeerPickerType] = useState<"audio" | "video" | null>(null);
  const [inCall, setInCall] = useState<{ callId: string; groupId: string; callType: "audio" | "video"; peerUserId: string; peerName?: string } | null>(null);
  const [pendingCallType, setPendingCallType] = useState<"audio" | "video" | null>(null);
  const [mediaViewer, setMediaViewer] = useState<MediaViewer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const inCallRef = useRef<{ callId: string; groupId: string; callType: "audio" | "video"; peerUserId: string; peerName?: string } | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/app/group/default"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/app/group", group?.id, "messages", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/app/group/${group!.id}/messages?limit=50&forUserId=${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!group?.id,
    refetchInterval: 5000,
  });

  const { data: groupMembers = [], isLoading: membersLoading } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/app/group", group?.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/app/group/${group!.id}/members`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!group?.id && peerPickerType !== null,
  });

  useEffect(() => {
    if (!group?.id || !user?.id) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/ws/calls?userId=${encodeURIComponent(user.id)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === "incoming-call" && msg.callId && msg.groupId === group.id) {
          setIncomingCall({
            callId: msg.callId,
            groupId: msg.groupId,
            callType: msg.callType || "audio",
            callerId: msg.callerId || "",
            callerName: msg.callerName || "Someone",
          });
          return;
        }
        if (msg.type === "call-ended") {
          setIncomingCall(null);
          await endWebRtcCall();
          return;
        }
        if (msg.type === "peer-joined" && msg.callId && msg.peerUserId) {
          const pc = pcRef.current;
          const currentInCall = inCallRef.current;
          if (pc && currentInCall && currentInCall.callId === msg.callId && currentInCall.peerUserId === msg.peerUserId) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal({
              type: "offer",
              callId: msg.callId,
              fromUserId: user.id,
              toUserId: msg.peerUserId,
              sdp: offer,
            });
          }
          return;
        }
        if (msg.type === "offer" || msg.type === "answer" || msg.type === "ice-candidate") {
          await handleSignalMessage(msg);
        }
      } catch (_) {}
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [group?.id, user?.id]);

  useEffect(() => {
    if (!inCall) {
      setCallSeconds(0);
      return;
    }
    setCallSeconds(0);
    const id = window.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [inCall]);

  const sendSignal = (payload: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(payload));
  };

  const createPeerConnection = async (peerUserId: string, callId: string, isCaller: boolean, audioOnly: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });
    pcRef.current = pc;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !audioOnly });
    localStreamRef.current = stream;
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          callId,
          fromUserId: user.id,
          toUserId: peerUserId,
          candidate: event.candidate,
        });
      }
    };
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;
      const currentInCall = inCallRef.current;
      if (!currentInCall) return;
      if (currentInCall.callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else if (currentInCall.callType === "audio" && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    };
    if (!isCaller) {
      // Callee: wait for offer in handleSignalMessage
    } else {
      // Caller: wait for peer-joined before creating/sending offer (handled in ws.onmessage)
    }
  };

  const handleSignalMessage = async (msg: any) => {
    const currentInCall = inCallRef.current;
    if (!currentInCall || msg.callId !== currentInCall.callId) return;
    let pc = pcRef.current;
    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      });
      pcRef.current = pc;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: currentInCall.callType === "video" });
      localStreamRef.current = stream;
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice-candidate",
            callId: currentInCall.callId,
            fromUserId: user.id,
            toUserId: msg.fromUserId,
            candidate: event.candidate,
          });
        }
      };
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;
        const updatedInCall = inCallRef.current;
        if (!updatedInCall) return;
        if (updatedInCall.callType === "video" && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        } else if (updatedInCall.callType === "audio" && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };
    }
    if (msg.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({
        type: "answer",
        callId: msg.callId,
        fromUserId: user.id,
        toUserId: msg.fromUserId,
        sdp: answer,
      });
    } else if (msg.type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    } else if (msg.type === "ice-candidate") {
      if (msg.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
          // ignore
        }
      }
    }
  };

  const endWebRtcCall = async () => {
    try {
      pcRef.current?.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {}
      });
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setInCall(null);
    setIncomingCall(null);
  };

  const sendMutation = useMutation({
    mutationFn: async (payload: { text?: string; imageUrl?: string; audioUrl?: string; replyToMessageId?: string }) => {
      const res = await fetch(`/api/app/group/${group!.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appUserId: user.id, ...payload }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data: { id: string; groupId: string; appUserId: string; text: string | null; imageUrl: string | null; audioUrl: string | null; replyToMessageId: string | null; createdAt: string }, _variables) => {
      const queryKey = ["/api/app/group", group?.id, "messages", user.id] as const;
      queryClient.setQueryData<Message[]>(queryKey, (old) => {
        const replyToMsg = replyTo ? { id: replyTo.id, text: replyTo.text?.slice(0, 80) ?? null, senderName: replyTo.senderName } : null;
        const newMsg: Message = {
          id: data.id,
          groupId: data.groupId,
          appUserId: data.appUserId,
          text: data.text,
          imageUrl: data.imageUrl,
          audioUrl: data.audioUrl,
          replyToMessageId: data.replyToMessageId,
          replyTo: replyToMsg,
          deletedAt: null,
          deletedForEveryone: false,
          deletedForUserIds: [],
          reactions: {},
          createdAt: data.createdAt,
          senderName: user.name,
          senderPhoto: user.selfPhoto ?? null,
        };
        return [...(old || []), newMsg];
      });
      setInputText("");
      setImagePreview(null);
      setAudioPreview(null);
      setReplyTo(null);
      isNearBottomRef.current = true;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ messageId, deleteForEveryone }: { messageId: string; deleteForEveryone: boolean }) => {
      const res = await fetch(`/api/app/group/${group!.id}/messages/${messageId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appUserId: user.id, deleteForEveryone }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/group", group?.id, "messages"] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await fetch(`/api/app/group/${group!.id}/messages/${messageId}/react`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appUserId: user.id, emoji }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/group", group?.id, "messages"] });
    },
  });

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    isNearBottomRef.current = true;
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const threshold = 120;
      isNearBottomRef.current = scrollTop + clientHeight >= scrollHeight - threshold;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (prevCount === 0) {
      scrollToBottom("auto");
      return;
    }
    if (isNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setAudioPreview(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startRecording = (mode: "auto" | "manual" = "auto") => {
    chunksRef.current = [];
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const audioDataUrl = reader.result as string;
          if (mode === "auto") {
            sendMutation.mutate({
              audioUrl: audioDataUrl,
            });
          } else {
            setAudioPreview(audioDataUrl);
          }
          setRecording(false);
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      setRecording(true);
    });
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleSend = () => {
    if (!group) return;
    const text = inputText.trim();
    if (!text && !imagePreview && !audioPreview) return;
    sendMutation.mutate({
      text: text || undefined,
      imageUrl: imagePreview || undefined,
      audioUrl: audioPreview || undefined,
      replyToMessageId: replyTo?.id,
    });
  };

  const canDeleteForEveryone = (msg: Message) => {
    if (msg.appUserId !== user.id) return false;
    const age = Date.now() - new Date(msg.createdAt).getTime();
    return age < 24 * 60 * 60 * 1000;
  };

  if (groupLoading || !group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const formatCallDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="h-dvh bg-slate-50 flex flex-col overflow-hidden relative">
      {pendingCallType && !inCall && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6">
          <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-white font-medium">
            {language === "hi"
              ? "कॉल कनेक्ट हो रही है..."
              : language === "pa"
              ? "ਕਾਲ ਕਨੈਕਟ ਹੋ ਰਹੀ ਹੈ..."
              : "Connecting call..."}
          </p>
        </div>
      )}
      {incomingCall && !inCall && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6">
          <p className="text-white text-lg font-medium mb-1">{incomingCall.callerName}</p>
          <p className="text-white/90 text-sm mb-6">
            {incomingCall.callType === "video"
              ? (language === "hi" ? "वीडियो कॉल" : language === "pa" ? "ਵੀਡੀਓ ਕਾਲ" : "Video call")
              : (language === "hi" ? "ऑडियो कॉल" : language === "pa" ? "ਔਡੀਓ ਕਾਲ" : "Audio call")}
          </p>
          <div className="flex gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={async () => {
                if (!incomingCall) return;
                await fetch(`/api/app/group/${incomingCall.groupId}/calls/${incomingCall.callId}/decline`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ appUserId: user.id }),
                });
                setIncomingCall(null);
              }}
            >
              <PhoneOff className="h-8 w-8" />
            </Button>
            <Button
              className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
              size="lg"
              onClick={async () => {
                if (!incomingCall) return;
                const peerUserId = incomingCall.callerId;
                await fetch(`/api/app/group/${incomingCall.groupId}/calls/${incomingCall.callId}/join`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ appUserId: user.id }),
                });
                setInCall({
                  callId: incomingCall.callId,
                  groupId: incomingCall.groupId,
                  callType: incomingCall.callType,
                  peerUserId,
                  peerName: incomingCall.callerName,
                });
                setIncomingCall(null);
                await createPeerConnection(peerUserId, incomingCall.callId, false, incomingCall.callType === "audio");
              }}
            >
              <Phone className="h-8 w-8" />
            </Button>
          </div>
          <p className="text-white/70 text-xs mt-4">
            {language === "hi" ? "रिंग हो रही है..." : language === "pa" ? "ਘੰਟੀ ਬਜ ਰਹੀ ਹੈ..." : "Ringing..."}
          </p>
        </div>
      )}
      {inCall && (
        <div className="fixed inset-0 z-40 bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3 text-white mb-4">
            {inCall.peerName && (
              <p className="text-base font-medium text-white/90">{inCall.peerName}</p>
            )}
            <p className="text-sm font-semibold">
              {inCall.callType === "video"
                ? language === "hi"
                  ? "वीडियो कॉल"
                  : language === "pa"
                  ? "ਵੀਡੀਓ ਕਾਲ"
                  : "Video call"
                : language === "hi"
                ? "ऑडियो कॉल"
                : language === "pa"
                ? "ਔਡੀਓ ਕਾਲ"
                : "Audio call"}
            </p>
            <p className="text-xs text-white/80">
              {callSeconds === 0
                ? language === "hi"
                  ? "कॉल कनेक्ट हो रही है..."
                  : language === "pa"
                  ? "ਕਾਲ ਕਨੈਕਟ ਹੋ ਰਹੀ ਹੈ..."
                  : "Connecting..."
                : formatCallDuration(callSeconds)}
            </p>
          </div>
          {inCall.callType === "video" && (
            <div className="w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
          )}
          {/* Remote audio sink (used for audio-only calls, and as a fallback) */}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
            onClick={async () => {
              if (inCall) {
                await fetch(`/api/app/group/${inCall.groupId}/calls/${inCall.callId}/end`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ appUserId: user.id }),
                });
              }
              await endWebRtcCall();
              setPendingCallType(null);
            }}
          >
            <PhoneOff className="h-8 w-8" />
          </Button>
        </div>
      )}
      <Dialog open={peerPickerType !== null} onOpenChange={(open) => !open && setPeerPickerType(null)}>
        <DialogContent className="max-w-sm">
          <h3 className="font-semibold text-slate-800">
            {peerPickerType === "audio"
              ? language === "hi"
                ? "ऑडियो कॉल - किसे कॉल करें?"
                : language === "pa"
                ? "ਔਡੀਓ ਕਾਲ - ਕਿਸਨੂੰ ਕਾਲ ਕਰਨੀ ਹੈ?"
                : "Audio call – who to call?"
              : language === "hi"
              ? "वीडियो कॉल - किसे कॉल करें?"
              : language === "pa"
              ? "ਵੀਡੀਓ ਕਾਲ - ਕਿਸਨੂੰ ਕਾਲ ਕਰਨੀ ਹੈ?"
              : "Video call – who to call?"}
          </h3>
          <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
            {membersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              groupMembers
              .filter((m) => m.id !== user.id)
              .map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left"
                  onClick={async () => {
                    if (!group || !peerPickerType) return;
                    setPendingCallType(peerPickerType);
                    setPeerPickerType(null);
                    const res = await fetch(`/api/app/group/${group.id}/calls`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ appUserId: user.id, type: peerPickerType, targetUserId: member.id }),
                    });
                    if (!res.ok) {
                      setPendingCallType(null);
                      return;
                    }
                    const data = await res.json();
                    setInCall({ callId: data.id, groupId: data.groupId, callType: peerPickerType, peerUserId: member.id, peerName: member.name });
                    setPendingCallType(null);
                    await createPeerConnection(member.id, data.id, true, peerPickerType === "audio");
                  }}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={photoUrl(member.id)} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-800">{member.name}</span>
                </button>
              ))
            )}
          </div>
          {groupMembers.length <= 1 && (
            <p className="text-sm text-slate-500 mt-2">
              {language === "hi" ? "ग्रुप में कोई और सदस्य नहीं।" : language === "pa" ? "ਗਰੁੱਪ ਵਿੱਚ ਕੋਈ ਹੋਰ ਮੈਂਬਰ ਨਹੀਂ।" : "No other members in the group."}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 shadow-md sticky top-0 z-10 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{group.name}</h1>
          <p className="text-xs text-white/80">
            {group.memberCount} {language === "hi" ? "सदस्य" : language === "pa" ? "ਮੈਂਬਰ" : "members"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            title="Audio call"
            onClick={() => setPeerPickerType("audio")}
            disabled={!!inCall || !!pendingCallType}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            title="Video call"
            onClick={() => setPeerPickerType("video")}
            disabled={!!inCall || !!pendingCallType}
          >
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 pb-28">
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">
            {language === "hi" ? "कोई संदेश नहीं। पहला संदेश भेजें!" : language === "pa" ? "ਕੋਈ ਸੁਨੇਹਾ ਨਹੀਂ। ਪਹਿਲਾ ਸੁਨੇਹਾ ਭੇਜੋ!" : "No messages yet. Send the first one!"}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.appUserId === user.id;
            const deleted = msg.deletedForEveryone;
            const deletedLabel = language === "hi" ? "यह संदेश हटा दिया गया" : language === "pa" ? "ਇਹ ਸੁਨੇਹਾ ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ" : "This message was deleted";
            let touchStartX = 0;
            let touchStartY = 0;
            const swipeThreshold = 40;
            const maxVerticalDelta = 30;

            const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
              const t = e.touches[0];
              touchStartX = t.clientX;
              touchStartY = t.clientY;
            };

            const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
              const t = e.changedTouches[0];
              const dx = t.clientX - touchStartX;
              const dy = t.clientY - touchStartY;
              if (Math.abs(dy) > maxVerticalDelta) return;
              if (dx > swipeThreshold) {
                // Swipe right
                setReplyTo(msg);
              } else if (dx < -swipeThreshold) {
                // Swipe left
                setReplyTo(msg);
              }
            };

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {msg.senderPhoto ? (
                    <AvatarImage src={msg.senderPhoto.startsWith("data:") ? msg.senderPhoto : photoUrl(msg.appUserId)} />
                  ) : null}
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">{msg.senderName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <span className="text-xs text-slate-500 mb-0.5">{msg.senderName}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`rounded-lg border shadow-sm px-3 py-2 text-left w-full max-w-full ${isMe ? "bg-blue-600 text-white border-blue-700" : "bg-white border-slate-200"}`}
                      >
                        <div className="space-y-1">
                          {msg.replyTo && (
                            <div className={`border-l-2 pl-2 text-xs opacity-90 ${isMe ? "border-blue-300" : "border-slate-300"}`}>
                              <p className="font-medium">{msg.replyTo.senderName}</p>
                              <p className="truncate">{msg.replyTo.text || "📷 Photo"}</p>
                            </div>
                          )}
                          {deleted ? (
                            <p className="text-sm italic opacity-80">{deletedLabel}</p>
                          ) : (
                            <>
                              {msg.text ? <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p> : null}
                              {msg.imageUrl ? (
                                <img
                                  src={msg.imageUrl}
                                  alt=""
                                  className="rounded max-w-full max-h-48 object-contain cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMediaViewer({ type: "image", url: msg.imageUrl! });
                                  }}
                                />
                              ) : null}
                              {msg.audioUrl ? (
                                <audio controls src={msg.audioUrl} className="max-w-full h-8" onClick={(e) => e.stopPropagation()} />
                              ) : null}
                            </>
                          )}
                          {Object.keys(msg.reactions || {}).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                              {Object.entries(msg.reactions || {}).map(([emoji, ids]) => (
                                <button
                                  type="button"
                                  key={emoji}
                                  className="text-xs bg-white/20 rounded px-1 cursor-pointer"
                                  title={ids.length > 0 ? ids.length + " reacted" : ""}
                                  onClick={() => reactMutation.mutate({ messageId: msg.id, emoji })}
                                >
                                  {emoji} {ids.length > 1 ? ids.length : ""}
                                </button>
                              ))}
                            </div>
                          )}
                          <p className={`text-[10px] ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isMe ? "end" : "start"}>
                      <DropdownMenuItem onClick={() => setReplyTo(msg)}>
                        <Reply className="h-4 w-4 mr-2" /> Reply
                      </DropdownMenuItem>
                      {QUICK_EMOJIS.map((emoji) => (
                        <DropdownMenuItem key={emoji} onClick={() => reactMutation.mutate({ messageId: msg.id, emoji })}>
                          {emoji} React
                        </DropdownMenuItem>
                      ))}
                      {msg.appUserId === user.id && (
                        <>
                          <DropdownMenuItem onClick={() => deleteMutation.mutate({ messageId: msg.id, deleteForEveryone: false })}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete for me
                          </DropdownMenuItem>
                          {canDeleteForEveryone(msg) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteMutation.mutate({ messageId: msg.id, deleteForEveryone: true })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete for everyone
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex flex-col gap-2">
        {replyTo && (
          <div className="flex items-center justify-between bg-slate-100 rounded-lg px-2 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-700 truncate">{replyTo.senderName}</p>
              <p className="text-xs text-slate-500 truncate">{replyTo.text || "Photo"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}>×</Button>
          </div>
        )}
        {(imagePreview || audioPreview) && (
          <div className="relative inline-flex max-w-[120px] items-center gap-2">
            {imagePreview && <img src={imagePreview} alt="" className="rounded-lg border h-20 object-cover" />}
            {audioPreview && <audio controls src={audioPreview} className="h-8 max-w-[160px]" />}
            <button
              type="button"
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
              onClick={() => {
                setImagePreview(null);
                setAudioPreview(null);
              }}
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button
            variant={recording ? "destructive" : "outline"}
            size="icon"
            title="Hold to record"
            onMouseDown={(e) => {
              e.preventDefault();
              if (!recording) startRecording("auto");
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              if (recording) stopRecording();
            }}
            onMouseLeave={(e) => {
              e.preventDefault();
              if (recording) stopRecording();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              if (!recording) startRecording("auto");
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (recording) stopRecording();
            }}
          >
            {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Input
            placeholder={language === "hi" ? "संदेश लिखें..." : language === "pa" ? "ਸੁਨੇਹਾ ਲਿਖੋ..." : "Type a message..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputText.trim() && !imagePreview && !audioPreview}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Dialog open={!!mediaViewer} onOpenChange={(open) => !open && setMediaViewer(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90 border-0">
          {mediaViewer?.type === "image" && (
            <div className="flex items-center justify-center bg-black">
              <img src={mediaViewer.url} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
