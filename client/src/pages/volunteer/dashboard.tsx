import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, MapPin, Plus, Clock, User, Key, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Village, VolunteerVisit } from "@shared/schema";

const visitFormSchema = z.object({
  villageId: z.string().min(1, "Please select a village"),
  visitType: z.string().optional(),
  notes: z.string().optional(),
});

const pinChangeSchema = z.object({
  newPin: z.string().length(4, "PIN must be 4 digits"),
  confirmPin: z.string().length(4, "PIN must be 4 digits"),
}).refine((data) => data.newPin === data.confirmPin, {
  message: "PINs do not match",
  path: ["confirmPin"],
});

type VisitFormData = z.infer<typeof visitFormSchema>;
type PinChangeData = z.infer<typeof pinChangeSchema>;

export default function VolunteerDashboardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [volunteerId, setVolunteerId] = useState<string | null>(null);
  const [volunteerName, setVolunteerName] = useState<string>("");

  useEffect(() => {
    const id = localStorage.getItem("volunteerId");
    const name = localStorage.getItem("volunteerName");
    if (!id) {
      setLocation("/volunteer-login");
    } else {
      setVolunteerId(id);
      setVolunteerName(name || "Volunteer");
    }
  }, [setLocation]);

  const visitForm = useForm<VisitFormData>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: { villageId: "", visitType: "", notes: "" },
  });

  const pinForm = useForm<PinChangeData>({
    resolver: zodResolver(pinChangeSchema),
    defaultValues: { newPin: "", confirmPin: "" },
  });

  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: visits, isLoading: visitsLoading } = useQuery<VolunteerVisit[]>({
    queryKey: [`/api/volunteer-visits/${volunteerId}`],
    enabled: !!volunteerId,
  });

  const createVisit = useMutation({
    mutationFn: async (data: VisitFormData) => {
      return apiRequest("POST", "/api/volunteer-visits", { ...data, volunteerId });
    },
    onSuccess: () => {
      toast({ title: "Visit recorded!" });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-visits", volunteerId] });
      setIsVisitOpen(false);
      visitForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to record visit", variant: "destructive" });
    },
  });

  const changePin = useMutation({
    mutationFn: async (data: PinChangeData) => {
      return apiRequest("PATCH", `/api/volunteers/${volunteerId}/pin`, { pin: data.newPin });
    },
    onSuccess: () => {
      toast({ title: "PIN changed successfully!" });
      setIsPinOpen(false);
      pinForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to change PIN", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("volunteerId");
    localStorage.removeItem("volunteerName");
    setLocation("/");
  };

  const getVillageName = (id: string | null) => villages?.find((v) => v.id === id)?.name || "-";

  if (!volunteerId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-volunteer-name">
                <User className="h-5 w-5 text-primary" />
                {volunteerName}
              </h1>
              <p className="text-sm text-muted-foreground">Volunteer Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isPinOpen} onOpenChange={setIsPinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-change-pin">
                  <Key className="h-4 w-4 mr-2" />
                  Change PIN
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change PIN</DialogTitle>
                </DialogHeader>
                <Form {...pinForm}>
                  <form onSubmit={pinForm.handleSubmit((data) => changePin.mutate(data))} className="space-y-4">
                    <FormField
                      control={pinForm.control}
                      name="newPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New PIN</FormLabel>
                          <FormControl>
                            <Input type="password" maxLength={4} placeholder="Enter new 4-digit PIN" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={pinForm.control}
                      name="confirmPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm PIN</FormLabel>
                          <FormControl>
                            <Input type="password" maxLength={4} placeholder="Confirm new PIN" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={changePin.isPending}>
                      {changePin.isPending ? "Changing..." : "Change PIN"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Record Visit
                  </CardTitle>
                  <CardDescription>Log your village/CSC visit</CardDescription>
                </div>
                <Dialog open={isVisitOpen} onOpenChange={setIsVisitOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-visit">
                      <Plus className="h-4 w-4 mr-2" />
                      New Visit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record New Visit</DialogTitle>
                    </DialogHeader>
                    <Form {...visitForm}>
                      <form onSubmit={visitForm.handleSubmit((data) => createVisit.mutate(data))} className="space-y-4">
                        <FormField
                          control={visitForm.control}
                          name="villageId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Village / CSC *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-visit-village">
                                    <SelectValue placeholder="Select village or CSC" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {villages?.filter(v => v.isActive).map((village) => (
                                    <SelectItem key={village.id} value={village.id}>
                                      {village.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={visitForm.control}
                          name="visitType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Visit Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="village_visit">Village Visit</SelectItem>
                                  <SelectItem value="csc_visit">CSC Visit</SelectItem>
                                  <SelectItem value="meeting">Meeting</SelectItem>
                                  <SelectItem value="event">Event</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={visitForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Add any notes about the visit..." {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={createVisit.isPending} data-testid="button-save-visit">
                          {createVisit.isPending ? "Recording..." : "Record Visit"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-3xl font-bold text-primary">{visits?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {visits?.filter(v => {
                      const today = new Date();
                      const visitDate = v.createdAt ? new Date(v.createdAt) : null;
                      return visitDate && visitDate.toDateString() === today.toDateString();
                    }).length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Today's Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Visits
              </CardTitle>
              <CardDescription>Your recent activity</CardDescription>
            </CardHeader>
            <CardContent>
              {visitsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !visits?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No visits recorded yet</p>
                  <p className="text-sm">Start by recording your first visit</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {visits.slice(0, 10).map((visit) => (
                    <div key={visit.id} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`visit-${visit.id}`}>
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getVillageName(visit.villageId)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{visit.createdAt ? new Date(visit.createdAt).toLocaleDateString() : "-"}</span>
                          {visit.visitType && (
                            <Badge variant="outline" className="text-xs">
                              {visit.visitType.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
