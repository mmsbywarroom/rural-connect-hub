import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Calendar, MapPin, Building2, Phone, CheckCircle, Loader2, ChevronRight, Edit2 } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, EventVenue } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "form";

interface EventVenueWithComputed extends EventVenue {
  googleMapsUrl?: string | null;
}

function isIndianMobile(input: string): boolean {
  const cleaned = input.replace(/\D/g, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

export default function TaskEventVenue({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [requesterName, setRequesterName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [venueName, setVenueName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [venueType, setVenueType] = useState<"marriage_hall" | "banquet" | "ground" | "conference_hall" | "other" | "">("");
  const [venueTypeOther, setVenueTypeOther] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const { data: myBookings = [] } = useQuery<EventVenueWithComputed[]>({
    queryKey: ["/api/event-venues/my-submissions", user.id],
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/event-venues/send-otp", { mobileNumber });
      return res.json();
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({ title: "OTP sent", description: `OTP sent to ${mobileNumber}` });
    },
    onError: () => {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/event-venues/verify-otp", { mobileNumber, otp });
      return res.json();
    },
    onSuccess: () => {
      setMobileVerified(true);
      toast({ title: "Mobile verified" });
    },
    onError: () => {
      toast({ title: "Invalid or expired OTP", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId,
        villageName: selectedVillageName,
        requesterName: requesterName.trim(),
        mobileNumber,
        mobileVerified,
        venueName: venueName.trim(),
        capacity: capacity ? Number(capacity) : null,
        venueType: venueType || "other",
        venueTypeOther: venueType === "other" ? venueTypeOther.trim() || null : null,
        date,
        time,
        locationLabel: locationLabel.trim() || null,
        latitude: latitude || null,
        longitude: longitude || null,
        status: "pending",
      };
      if (editingId) {
        const res = await apiRequest("PATCH", `/api/event-venues/my-submissions/${editingId}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/event-venues/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-venues/my-submissions", user.id] });
      toast({ title: editingId ? "Booking updated" : "Booking request submitted" });
      resetForm();
      setStep("description");
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to submit booking";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedVillageId("");
    setSelectedVillageName("");
    setEditingId(null);
    setRequesterName("");
    setMobileNumber("");
    setMobileVerified(false);
    setOtpSent(false);
    setOtp("");
    setVenueName("");
    setCapacity("");
    setVenueType("");
    setVenueTypeOther("");
    setDate("");
    setTime("");
    setLocationLabel("");
    setLatitude("");
    setLongitude("");
  };

  const handleBack = () => {
    switch (step) {
      case "select_unit":
        setStep("description");
        break;
      case "form":
        setStep("select_unit");
        break;
      default:
        setLocation("/app");
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      setLatitude(lat);
      setLongitude(lng);
    });
  };

  const handleSubmit = () => {
    if (!requesterName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!venueName.trim()) {
      toast({ title: "Venue name is required", variant: "destructive" });
      return;
    }
    if (!venueType) {
      toast({ title: "Select venue type", variant: "destructive" });
      return;
    }
    if (venueType === "other" && !venueTypeOther.trim()) {
      toast({ title: "Specify other venue type", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Select date", variant: "destructive" });
      return;
    }
    if (!time) {
      toast({ title: "Select time", variant: "destructive" });
      return;
    }
    if (!locationLabel.trim()) {
      toast({ title: "Location is required", variant: "destructive" });
      return;
    }
    if (!mobileNumber || !isIndianMobile(mobileNumber) || !mobileVerified) {
      toast({ title: "Please verify mobile number with OTP", variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  };

  const enrichedBookings: EventVenueWithComputed[] = (myBookings || []).map((b) => ({
    ...b,
    googleMapsUrl: b.latitude && b.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}` : null,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Event Venues
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {step === "description" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 flex gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Event venue booking</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Select the unit where the event is happening, verify the contact person via OTP, fill venue details, date, time and location. Admin will review and accept the booking.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full bg-blue-600"
              onClick={() => setStep("select_unit")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              New Event Venue Booking
            </Button>

            {enrichedBookings && enrichedBookings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Your bookings ({enrichedBookings.length})
                  </h3>
                </div>
                {enrichedBookings.map((b) => (
                  <Card key={b.id} className="overflow-visible">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{b.venueName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {b.villageName || selectedVillageName || "—"} • {b.date} • {b.time}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {b.locationLabel || "No location description"}
                          </p>
                        </div>
                        <Badge
                          className={
                            b.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : b.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </Badge>
                      </div>
                      {b.adminMessage && (
                        <p className="text-xs text-slate-600 border-l-2 border-blue-300 pl-2">
                          Admin: {b.adminMessage}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          className="text-xs text-blue-600 flex items-center gap-1"
                          disabled={b.status === "accepted"}
                          onClick={() => {
                            setEditingId(b.id);
                            setSelectedVillageId(b.villageId || "");
                            setSelectedVillageName(b.villageName || "");
                            setRequesterName(b.requesterName || "");
                            setMobileNumber(b.mobileNumber || "");
                            setMobileVerified(!!b.mobileVerified);
                            setOtpSent(false);
                            setOtp("");
                            setVenueName(b.venueName || "");
                            setCapacity(b.capacity ? String(b.capacity) : "");
                            setVenueType((b.venueType as any) || "");
                            setVenueTypeOther(b.venueTypeOther || "");
                            setDate(b.date || "");
                            setTime(b.time || "");
                            setLocationLabel(b.locationLabel || "");
                            setLatitude(b.latitude || "");
                        setLongitude(b.longitude || "");
                            setStep("form");
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                          {b.status === "accepted" ? "Editing disabled" : "Edit"}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "select_unit" && (
          <UnitSelector
            onSelect={(unit) => {
              setSelectedVillageId(unit.villageId);
              setSelectedVillageName(unit.villageName);
              setStep("form");
            }}
            title="Select Unit"
            subtitle="Choose the village/ward where the event venue is located"
            defaultVillageId={user.mappedAreaId || undefined}
          />
        )}

        {step === "form" && (
          <div className="space-y-4">
            <div className="px-1">
              <Badge className="bg-blue-100 text-blue-800">
                {selectedVillageName}
              </Badge>
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Booking person name *</label>
                  <Input
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Enter name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Mobile number (OTP verification) *</label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setMobileNumber(val);
                        if (val !== mobileNumber) {
                          setMobileVerified(false);
                          setOtpSent(false);
                          setOtp("");
                        }
                      }}
                      placeholder="9876543210"
                      disabled={mobileVerified}
                    />
                    {!mobileVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => sendOtpMutation.mutate()}
                        disabled={!isIndianMobile(mobileNumber) || sendOtpMutation.isPending}
                      >
                        {sendOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Phone className="h-4 w-4 mr-1" />}
                        Send OTP
                      </Button>
                    )}
                    {mobileVerified && (
                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  {otpSent && !mobileVerified && (
                    <div className="space-y-2 pt-2 border-t border-blue-200 bg-blue-50 rounded-md p-3">
                      <p className="text-xs text-blue-700">
                        OTP sent to {mobileNumber}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          maxLength={4}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="Enter 4-digit OTP"
                        />
                        <Button
                          size="sm"
                          className="bg-blue-600"
                          onClick={() => verifyOtpMutation.mutate()}
                          disabled={otp.length !== 4 || verifyOtpMutation.isPending}
                        >
                          {verifyOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Verify
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Venue name *</label>
                  <Input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Eg. Community Hall, City Banquet"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Capacity (approx)</label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
                    placeholder="Number of people"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Venue type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "marriage_hall", label: "Marriage hall" },
                      { id: "banquet", label: "Banquet" },
                      { id: "ground", label: "Ground" },
                      { id: "conference_hall", label: "Conference hall" },
                      { id: "other", label: "Other" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`border rounded-lg px-3 py-2 text-sm text-left ${
                          venueType === opt.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                        }`}
                        onClick={() => setVenueType(opt.id as any)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {venueType === "other" && (
                    <Input
                      className="mt-2"
                      value={venueTypeOther}
                      onChange={(e) => setVenueTypeOther(e.target.value)}
                      placeholder="Describe venue type"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Date *</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Time *</label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Location (required)</label>
                  <Textarea
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    placeholder="Landmark / address that helps reach the venue"
                    rows={2}
                  />
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseCurrentLocation}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Use current location
                    </Button>
                    {latitude && longitude && (
                      <span className="text-[11px] text-slate-500">
                        {latitude}, {longitude}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full bg-blue-600"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Submit booking
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

