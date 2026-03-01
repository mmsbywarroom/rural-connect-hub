import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, MessageCircle, Users, UserMinus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ChatGroupInfo {
  id: string;
  name: string;
  isAllUsersGroup: boolean;
  createdAt: string;
  memberCount: number;
  members: { id: string; name: string; mobileNumber: string | null; isActive: boolean }[];
}

interface ChatMessageRow {
  id: string;
  appUserId: string;
  senderName: string;
  text: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  deletedForEveryone: boolean;
  createdAt: string;
}

export default function GroupChatManagementPage() {
  const queryClient = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteMsgTarget, setDeleteMsgTarget] = useState<{ id: string; preview: string } | null>(null);

  const { data, isLoading, error } = useQuery<ChatGroupInfo>({
    queryKey: ["/api/admin/chat-group"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/chat-group");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessageRow[]>({
    queryKey: ["/api/admin/chat-group/messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/chat-group/messages?limit=30");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!data?.id,
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (appUserId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/chat-group/members/${appUserId}`);
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat-group"] });
      setRemoveTarget(null);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/chat-group/messages/${messageId}`);
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat-group/messages"] });
      setDeleteMsgTarget(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load group chat details.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-orange-600" />
            <CardTitle>Group Chat</CardTitle>
          </div>
          <CardDescription>
            Manage the app-wide group chat. All registered app users are automatically added to this group. New users join when they register.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="rounded-lg border bg-muted/50 px-4 py-2">
              <p className="text-xs text-muted-foreground">Group name</p>
              <p className="font-medium">{data.name}</p>
            </div>
            <div className="rounded-lg border bg-muted/50 px-4 py-2">
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="font-medium flex items-center gap-1">
                <Users className="h-4 w-4" /> {data.memberCount}
              </p>
            </div>
            {data.isAllUsersGroup && (
              <Badge variant="secondary">All users group</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            To sync all active app users into the group (e.g. after adding users manually), run on the server: <code className="bg-muted px-1 rounded">npm run chat:init</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members in this group</CardTitle>
          <CardDescription>List of app users who can see and send messages in the group chat.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No members yet. Run <code className="bg-muted px-1 rounded">npm run chat:init</code> to add all app users.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.mobileNumber ?? "—"}</TableCell>
                    <TableCell>
                      {m.isActive ? <Badge variant="default" className="bg-green-600">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRemoveTarget({ id: m.id, name: m.name })}
                      >
                        <UserMinus className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent messages</CardTitle>
          <CardDescription>Delete any message for everyone. Deleted messages show as &quot;This message was deleted&quot; for all users.</CardDescription>
        </CardHeader>
        <CardContent>
          {messagesLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No messages yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-medium">{msg.senderName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {msg.deletedForEveryone ? <span className="italic text-muted-foreground">Deleted</span> : msg.text || (msg.imageUrl ? "📷 Photo" : msg.audioUrl ? "🎤 Audio" : "—")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(msg.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {!msg.deletedForEveryone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteMsgTarget({ id: msg.id, preview: (msg.text || "").slice(0, 40) || "message" })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from group?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && <>Remove <strong>{removeTarget.name}</strong> from the group? They will no longer see or send messages in this chat. They can be re-added later with &quot;npm run chat:init&quot; or when they re-register.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTarget && removeMemberMutation.mutate(removeTarget.id)}
            >
              {removeMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteMsgTarget} onOpenChange={() => setDeleteMsgTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMsgTarget && <>This message will show as &quot;This message was deleted&quot; for all users. This cannot be undone.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMsgTarget && deleteMessageMutation.mutate(deleteMsgTarget.id)}
            >
              {deleteMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
