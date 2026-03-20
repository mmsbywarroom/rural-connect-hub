import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Cake, Edit, Search, Loader2, Clock, PartyPopper, User, Phone, Calendar, Send, Gift } from "lucide-react";

interface BirthdayUser {
  id: string;
  name: string;
  ocrDob: string | null;
  selfPhoto: string | null;
  mobileNumber: string | null;
  role: string | null;
}

function getNextBirthday(dobStr: string): Date {
  const now = new Date();
  const parts = dobStr.split(/[-/]/);
  let day: number, month: number;

  if (parts[0].length === 4) {
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (parseInt(parts[2], 10) > 31) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  }

  if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 0 || month > 11) return new Date(9999, 0, 1);

  let nextBday = new Date(now.getFullYear(), month, day, 0, 0, 0, 0);
  if (nextBday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    nextBday = new Date(now.getFullYear() + 1, month, day, 0, 0, 0, 0);
  }
  return nextBday;
}

function getCountdown(targetDate: Date): { days: number; hours: number; minutes: number; seconds: number; isToday: boolean } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (today.getTime() === target.getTime()) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isToday: true };
  }

  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isToday: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isToday: false };
}

function LiveCountdown({ dob }: { dob: string }) {
  const [countdown, setCountdown] = useState(() => getCountdown(getNextBirthday(dob)));

  useEffect(() => {
    const nextBday = getNextBirthday(dob);
    const timer = setInterval(() => {
      setCountdown(getCountdown(nextBday));
    }, 1000);
    return () => clearInterval(timer);
  }, [dob]);

  if (countdown.isToday) {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold" data-testid="text-birthday-today">
        <PartyPopper className="h-4 w-4" />
        <span>Birthday Today!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm" data-testid="text-birthday-countdown">
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex gap-1">
        <span className="font-semibold text-foreground">{countdown.days}<span className="text-muted-foreground font-normal">d</span></span>
        <span className="font-semibold text-foreground">{countdown.hours}<span className="text-muted-foreground font-normal">h</span></span>
        <span className="font-semibold text-foreground">{countdown.minutes}<span className="text-muted-foreground font-normal">m</span></span>
        <span className="font-semibold text-foreground">{countdown.seconds}<span className="text-muted-foreground font-normal">s</span></span>
      </div>
    </div>
  );
}

export default function BirthdayManagerPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editUser, setEditUser] = useState<BirthdayUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [filter, setFilter] = useState<"all" | "with-dob" | "no-dob" | "today" | "this-week" | "this-month">("all");
  const [sendingWishId, setSendingWishId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<BirthdayUser[]>({
    queryKey: ["/api/admin/birthdays"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, ocrDob }: { id: string; name: string; ocrDob: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/birthdays/${id}`, { name, ocrDob });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/birthdays"] });
      setEditUser(null);
      toast({ title: "Updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const sendWishMutation = useMutation({
    mutationFn: async (userId: string) => {
      setSendingWishId(userId);
      const res = await apiRequest("POST", `/api/admin/birthdays/${userId}/wish`);
      return res.json();
    },
    onSuccess: (data) => {
      setSendingWishId(null);
      toast({ title: "Birthday wish sent!", description: "SMS delivered successfully" });
    },
    onError: (error: any) => {
      setSendingWishId(null);
      toast({ title: "Failed to send wish", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  const openEdit = (user: BirthdayUser) => {
    setEditUser(user);
    setEditName(user.name);
    setEditDob(user.ocrDob || "");
  };

  const handleSave = () => {
    if (!editUser) return;
    if (!editName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: editUser.id, name: editName.trim(), ocrDob: editDob.trim() });
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const now = new Date();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    let list = users;

    if (filter === "with-dob") {
      list = list.filter(u => u.ocrDob);
    } else if (filter === "no-dob") {
      list = list.filter(u => !u.ocrDob);
    } else if (filter === "today") {
      list = list.filter(u => {
        if (!u.ocrDob) return false;
        const next = getNextBirthday(u.ocrDob);
        return next.getMonth() === todayMonth && next.getDate() === todayDate && next.getFullYear() === now.getFullYear();
      });
    } else if (filter === "this-week") {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      list = list.filter(u => {
        if (!u.ocrDob) return false;
        const next = getNextBirthday(u.ocrDob);
        return next >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && next <= weekEnd;
      });
    } else if (filter === "this-month") {
      list = list.filter(u => {
        if (!u.ocrDob) return false;
        const next = getNextBirthday(u.ocrDob);
        return next.getMonth() === todayMonth && next.getFullYear() === now.getFullYear();
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(term) ||
        (u.mobileNumber && u.mobileNumber.includes(term)) ||
        (u.ocrDob && u.ocrDob.includes(term))
      );
    }

    return list.sort((a, b) => {
      if (!a.ocrDob && !b.ocrDob) return a.name.localeCompare(b.name);
      if (!a.ocrDob) return 1;
      if (!b.ocrDob) return -1;
      const nextA = getNextBirthday(a.ocrDob).getTime();
      const nextB = getNextBirthday(b.ocrDob).getTime();
      return nextA - nextB;
    });
  }, [users, filter, searchTerm]);

  const todayCount = useMemo(() => {
    if (!users) return 0;
    const now = new Date();
    return users.filter(u => {
      if (!u.ocrDob) return false;
      const next = getNextBirthday(u.ocrDob);
      return next.getMonth() === now.getMonth() && next.getDate() === now.getDate() && next.getFullYear() === now.getFullYear();
    }).length;
  }, [users]);

  const thisWeekCount = useMemo(() => {
    if (!users) return 0;
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return users.filter(u => {
      if (!u.ocrDob) return false;
      const next = getNextBirthday(u.ocrDob);
      return next >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && next <= weekEnd;
    }).length;
  }, [users]);

  const thisMonthCount = useMemo(() => {
    if (!users) return 0;
    const now = new Date();
    return users.filter(u => {
      if (!u.ocrDob) return false;
      const next = getNextBirthday(u.ocrDob);
      return next.getMonth() === now.getMonth() && next.getFullYear() === now.getFullYear();
    }).length;
  }, [users]);

  const withDobCount = useMemo(() => users?.filter(u => u.ocrDob).length || 0, [users]);
  const noDobCount = useMemo(() => users?.filter(u => !u.ocrDob).length || 0, [users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const filterButtons: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: users?.length || 0 },
    { key: "today", label: "Today", count: todayCount },
    { key: "this-week", label: "This Week", count: thisWeekCount },
    { key: "this-month", label: "This Month", count: thisMonthCount },
    { key: "with-dob", label: "With DOB", count: withDobCount },
    { key: "no-dob", label: "No DOB", count: noDobCount },
  ];

  return (
    <div className="space-y-4" data-testid="birthday-manager-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Cake className="h-6 w-6 text-pink-500" />
          <h1 className="text-xl font-bold" data-testid="text-birthday-title">Birthday Manager</h1>
          {todayCount > 0 && (
            <Badge variant="default" className="bg-amber-500 text-white">{todayCount} Today</Badge>
          )}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, mobile, DOB..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-birthday-search"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filterButtons.map((fb) => (
          <Button
            key={fb.key}
            variant={filter === fb.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(fb.key)}
            data-testid={`button-filter-${fb.key}`}
          >
            {fb.label}
            {fb.count > 0 && <span className="ml-1 opacity-70">({fb.count})</span>}
          </Button>
        ))}
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Cake className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredUsers.map((user) => {
            const hasDob = !!user.ocrDob;
            const isToday = hasDob && (() => {
              const next = getNextBirthday(user.ocrDob!);
              const now = new Date();
              return next.getMonth() === now.getMonth() && next.getDate() === now.getDate() && next.getFullYear() === now.getFullYear();
            })();

            return (
              <Card
                key={user.id}
                className={isToday ? "border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : ""}
                data-testid={`card-birthday-${user.id}`}
              >
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <Avatar className="w-11 h-11 min-w-[44px] min-h-[44px] overflow-hidden">
                    {user.selfPhoto ? (
                      <AvatarImage src={user.selfPhoto} className="object-cover w-full h-full" />
                    ) : (
                      <AvatarFallback className="bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 text-sm font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate" data-testid={`text-name-${user.id}`}>{user.name}</span>
                      {isToday && <Badge variant="default" className="bg-amber-500 text-white text-xs no-default-hover-elevate no-default-active-elevate">Birthday!</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {hasDob ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {user.ocrDob}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No DOB set</span>
                      )}
                      {user.mobileNumber && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {user.mobileNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasDob && <LiveCountdown dob={user.ocrDob!} />}
                    {user.mobileNumber && (
                      <Button
                        size="sm"
                        variant={isToday ? "default" : "outline"}
                        className={isToday ? "bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white border-0 gap-1.5" : "gap-1.5"}
                        onClick={() => sendWishMutation.mutate(user.id)}
                        disabled={sendingWishId === user.id}
                        data-testid={`button-wish-${user.id}`}
                      >
                        {sendingWishId === user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Gift className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Send Wish</span>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(user)}
                      data-testid={`button-edit-${user.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Birthday Info
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter name"
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date of Birth</label>
              <Input
                type="date"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
                data-testid="input-edit-dob"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: YYYY-MM-DD</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} data-testid="button-edit-cancel">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-edit-save">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
