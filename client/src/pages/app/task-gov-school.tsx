import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Mic, MicOff, Play, Square, Trash2, Send, Loader2, Phone, CheckCircle, ChevronRight, Search, Clock, MessageSquare, AlertCircle, MapPin, School } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, GovSchoolSubmission, GovSchoolLog, GovSchoolIssueCategory } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "form";

interface SubmissionWithLogs extends GovSchoolSubmission {
  logs: GovSchoolLog[];
}

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Gov School Work", hi: "सरकारी स्कूल कार्य", pa: "ਸਰਕਾਰੀ ਸਕੂਲ ਕੰਮ" },
  description: { en: "Submit reports about government school issues and track their resolution progress.", hi: "सरकारी स्कूल की समस्याओं के बारे में रिपोर्ट दर्ज करें और उनकी समाधान प्रगति को ट्रैक करें।", pa: "ਸਰਕਾਰੀ ਸਕੂਲ ਦੀਆਂ ਸਮੱਸਿਆਵਾਂ ਬਾਰੇ ਰਿਪੋਰਟ ਦਰਜ ਕਰੋ ਅਤੇ ਉਨ੍ਹਾਂ ਦੀ ਹੱਲ ਪ੍ਰਗਤੀ ਨੂੰ ਟ੍ਰੈਕ ਕਰੋ।" },
  newSubmission: { en: "File New Report", hi: "नई रिपोर्ट दर्ज करें", pa: "ਨਵੀਂ ਰਿਪੋਰਟ ਦਰਜ ਕਰੋ" },
  previousSubmissions: { en: "Your Submissions", hi: "आपकी रिपोर्ट", pa: "ਤੁਹਾਡੀਆਂ ਰਿਪੋਰਟਾਂ" },
  verifyMobile: { en: "Verify Mobile Number", hi: "मोबाइल नंबर सत्यापित करें", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ" },
  verifyMobileSubtitle: { en: "Enter your mobile number to verify via OTP", hi: "OTP से सत्यापन के लिए मोबाइल नंबर दर्ज करें", pa: "OTP ਰਾਹੀਂ ਤਸਦੀਕ ਲਈ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  enterMobile: { en: "Enter 10-digit mobile number", hi: "10 अंकों का मोबाइल नंबर दर्ज करें", pa: "10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  enterOtp: { en: "Enter 4-digit OTP", hi: "4 अंकों का OTP दर्ज करें", pa: "4 ਅੰਕਾਂ ਦਾ OTP ਦਰਜ ਕਰੋ" },
  verifyOtp: { en: "Verify OTP", hi: "OTP सत्यापित करें", pa: "OTP ਤਸਦੀਕ ਕਰੋ" },
  otpSentTo: { en: "OTP sent to", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  otpVerified: { en: "Mobile number verified!", hi: "मोबाइल नंबर सत्यापित!", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ!" },
  invalidOtp: { en: "Invalid or expired OTP", hi: "अमान्य या समाप्त OTP", pa: "ਅਵੈਧ ਜਾਂ ਮਿਆਦ ਪੁੱਗੀ OTP" },
  failedToSendOtp: { en: "Failed to send OTP", hi: "OTP भेजने में विफल", pa: "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ" },
  submissionFailed: { en: "Submission failed", hi: "जमा करने में विफल", pa: "ਜਮ੍ਹਾਂ ਕਰਨ ਵਿੱਚ ਅਸਫਲ" },
  micDenied: { en: "Microphone access denied", hi: "माइक्रोफोन अनुमति अस्वीकृत", pa: "ਮਾਈਕ੍ਰੋਫੋਨ ਪਹੁੰਚ ਅਸਵੀਕਾਰ" },
  mapsNotConfigured: { en: "Google Maps API key not configured", hi: "गूगल मैप्स API कुंजी कॉन्फ़िगर नहीं है", pa: "ਗੂਗਲ ਮੈਪਸ API ਕੁੰਜੀ ਕੌਂਫਿਗਰ ਨਹੀਂ ਹੈ" },
  selectUnit: { en: "Select Unit", hi: "इकाई चुनें", pa: "ਯੂਨਿਟ ਚੁਣੋ" },
  selectUnitSubtitle: { en: "Choose the village/ward for the report", hi: "रिपोर्ट के लिए गांव/वार्ड चुनें", pa: "ਰਿਪੋਰਟ ਲਈ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  schoolName: { en: "School Name", hi: "स्कूल का नाम", pa: "ਸਕੂਲ ਦਾ ਨਾਮ" },
  principalName: { en: "Principal Name", hi: "प्रधानाचार्य का नाम", pa: "ਪ੍ਰਿੰਸੀਪਲ ਦਾ ਨਾਮ" },
  principalMobile: { en: "Principal Mobile Number", hi: "प्रधानाचार्य का मोबाइल नंबर", pa: "ਪ੍ਰਿੰਸੀਪਲ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ" },
  issueCategory: { en: "Issue Category", hi: "समस्या श्रेणी", pa: "ਮੁੱਦੇ ਦੀ ਸ਼੍ਰੇਣੀ" },
  selectCategory: { en: "Select issue category", hi: "समस्या श्रेणी चुनें", pa: "ਮੁੱਦੇ ਦੀ ਸ਼੍ਰੇਣੀ ਚੁਣੋ" },
  searchCategory: { en: "Search categories...", hi: "श्रेणियां खोजें...", pa: "ਸ਼੍ਰੇਣੀਆਂ ਖੋਜੋ..." },
  nodalVolunteerName: { en: "Nodal Volunteer Name", hi: "नोडल वालंटियर का नाम", pa: "ਨੋਡਲ ਵਲੰਟੀਅਰ ਦਾ ਨਾਮ" },
  nodalVolunteerMobile: { en: "Nodal Volunteer Mobile", hi: "नोडल वालंटियर का मोबाइल", pa: "ਨੋਡਲ ਵਲੰਟੀਅਰ ਦਾ ਮੋਬਾਈਲ" },
  descriptionLabel: { en: "Description", hi: "विवरण", pa: "ਵੇਰਵਾ" },
  descriptionPlaceholder: { en: "Describe the issue in detail...", hi: "समस्या का विस्तार से वर्णन करें...", pa: "ਸਮੱਸਿਆ ਦਾ ਵਿਸਤਾਰ ਨਾਲ ਵਰਣਨ ਕਰੋ..." },
  audioNote: { en: "Voice Note (Optional)", hi: "वॉइस नोट (वैकल्पिक)", pa: "ਵੌਇਸ ਨੋਟ (ਵਿਕਲਪਿਕ)" },
  record: { en: "Record", hi: "रिकॉर्ड", pa: "ਰਿਕਾਰਡ" },
  recording: { en: "Recording...", hi: "रिकॉर्ड हो रहा है...", pa: "ਰਿਕਾਰਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  recorded: { en: "Voice note recorded", hi: "वॉइस नोट रिकॉर्ड", pa: "ਵੌਇਸ ਨੋਟ ਰਿਕਾਰਡ" },
  stop: { en: "Stop", hi: "रोकें", pa: "ਰੋਕੋ" },
  play: { en: "Play", hi: "सुनें", pa: "ਸੁਣੋ" },
  delete: { en: "Delete", hi: "हटाएं", pa: "ਹਟਾਓ" },
  location: { en: "Google Maps Location", hi: "गूगल मैप्स स्थान", pa: "ਗੂਗਲ ਮੈਪਸ ਟਿਕਾਣਾ" },
  currentLocation: { en: "Use Current Location", hi: "वर्तमान स्थान का उपयोग करें", pa: "ਮੌਜੂਦਾ ਟਿਕਾਣਾ ਵਰਤੋ" },
  dragPinToSelect: { en: "Drag the pin to select exact location", hi: "सटीक स्थान चुनने के लिए पिन खींचें", pa: "ਸਹੀ ਟਿਕਾਣਾ ਚੁਣਨ ਲਈ ਪਿੰਨ ਖਿੱਚੋ" },
  loadingMap: { en: "Loading map...", hi: "मानचित्र लोड हो रहा है...", pa: "ਨਕਸ਼ਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  submit: { en: "Submit Report", hi: "रिपोर्ट जमा करें", pa: "ਰਿਪੋਰਟ ਜਮ੍ਹਾਂ ਕਰੋ" },
  submitting: { en: "Submitting...", hi: "जमा हो रहा है...", pa: "ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ..." },
  submitted: { en: "Report Submitted!", hi: "रिपोर्ट दर्ज हो गई!", pa: "ਰਿਪੋਰਟ ਦਰਜ ਹੋ ਗਈ!" },
  back: { en: "Back", hi: "वापस", pa: "ਵਾਪਸ" },
  pending: { en: "Pending", hi: "लंबित", pa: "ਬਕਾਇਆ" },
  accepted: { en: "Accepted", hi: "स्वीकृत", pa: "ਮਨਜ਼ੂਰ" },
  "in-progress": { en: "In Progress", hi: "प्रगति में", pa: "ਪ੍ਰਗਤੀ ਵਿੱਚ" },
  completed: { en: "Completed", hi: "पूर्ण", pa: "ਪੂਰਾ" },
  journey: { en: "Journey", hi: "यात्रा", pa: "ਯਾਤਰਾ" },
  noSubmissions: { en: "No submissions yet", hi: "अभी कोई रिपोर्ट नहीं", pa: "ਅਜੇ ਕੋਈ ਰਿਪੋਰਟ ਨਹੀਂ" },
  schoolNameRequired: { en: "School name is required", hi: "स्कूल का नाम आवश्यक है", pa: "ਸਕੂਲ ਦਾ ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ" },
  principalNameRequired: { en: "Principal name is required", hi: "प्रधानाचार्य का नाम आवश्यक है", pa: "ਪ੍ਰਿੰਸੀਪਲ ਦਾ ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ" },
  categoryRequired: { en: "Please select an issue category", hi: "कृपया समस्या श्रेणी चुनें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਮੁੱਦੇ ਦੀ ਸ਼੍ਰੇਣੀ ਚੁਣੋ" },
  verified: { en: "Verified", hi: "सत्यापित", pa: "ਤਸਦੀਕਿਤ" },
  mobileNumber: { en: "Mobile Number", hi: "मोबाइल नंबर", pa: "ਮੋਬਾਈਲ ਨੰਬਰ" },
  expectedDays: { en: "Expected Resolution", hi: "अपेक्षित समाधान", pa: "ਅਨੁਮਾਨਿਤ ਹੱਲ" },
  days: { en: "days", hi: "दिन", pa: "ਦਿਨ" },
  principalMobileVerified: { en: "Principal mobile verified", hi: "प्रधानाचार्य का मोबाइल सत्यापित", pa: "ਪ੍ਰਿੰਸੀਪਲ ਦਾ ਮੋਬਾਈਲ ਤਸਦੀਕ" },
  nodalMobileVerified: { en: "Nodal volunteer mobile verified", hi: "नोडल वालंटियर का मोबाइल सत्यापित", pa: "ਨੋਡਲ ਵਲੰਟੀਅਰ ਦਾ ਮੋਬਾਈਲ ਤਸਦੀਕ" },
  verify: { en: "Verify", hi: "सत्यापित करें", pa: "ਤਸਦੀਕ ਕਰੋ" },
  principalMobileRequired: { en: "Please verify principal's mobile number first", hi: "कृपया पहले प्रधानाचार्य का मोबाइल नंबर सत्यापित करें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਪ੍ਰਿੰਸੀਪਲ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ" },
  nodalMobileRequired: { en: "Please verify nodal volunteer's mobile number first", hi: "कृपया पहले नोडल वालंटियर का मोबाइल नंबर सत्यापित करें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਨੋਡਲ ਵਲੰਟੀਅਰ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ" },
};

function l(key: string, lang: string): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as Record<string, string>)[lang] || entry.en;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  "in-progress": "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
};

const actionColors: Record<string, string> = {
  submitted: "border-yellow-400 bg-yellow-50",
  accepted: "border-blue-400 bg-blue-50",
  completed: "border-green-400 bg-green-50",
};

declare global {
  interface Window {
    google: any;
    initGovSchoolMap: () => void;
  }
}

function GoogleMapPicker({
  latitude,
  longitude,
  onLocationChange,
  language,
}: {
  latitude: string;
  longitude: string;
  onLocationChange: (lat: string, lng: string) => void;
  language: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const initMap = useCallback(
    (lat: number, lng: number) => {
      if (!mapRef.current || !window.google) return;

      const position = { lat, lng };
      const map = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom: 15,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });

      const marker = new window.google.maps.Marker({
        position,
        map,
        draggable: true,
        title: l("dragPinToSelect", language),
      });

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) {
          onLocationChange(pos.lat().toFixed(6), pos.lng().toFixed(6));
        }
      });

      map.addListener("click", (e: any) => {
        const clickLat = e.latLng.lat();
        const clickLng = e.latLng.lng();
        marker.setPosition({ lat: clickLat, lng: clickLng });
        onLocationChange(clickLat.toFixed(6), clickLng.toFixed(6));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setMapLoaded(true);
    },
    [language, onLocationChange]
  );

  useEffect(() => {
    if (!apiKey) return;

    if (window.google && window.google.maps) {
      const lat = latitude ? parseFloat(latitude) : 30.34;
      const lng = longitude ? parseFloat(longitude) : 76.39;
      initMap(lat, lng);
      return;
    }

    window.initGovSchoolMap = () => {
      const lat = latitude ? parseFloat(latitude) : 30.34;
      const lng = longitude ? parseFloat(longitude) : 76.39;
      initMap(lat, lng);
    };

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGovSchoolMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      if (window.google && window.google.maps) {
        const lat = latitude ? parseFloat(latitude) : 30.34;
        const lng = longitude ? parseFloat(longitude) : 76.39;
        initMap(lat, lng);
      }
    }
  }, [apiKey]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onLocationChange(lat.toFixed(6), lng.toFixed(6));
        if (mapInstanceRef.current && markerRef.current) {
          const pos = { lat, lng };
          mapInstanceRef.current.setCenter(pos);
          markerRef.current.setPosition(pos);
        }
        setGettingLocation(false);
      },
      () => {
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (!apiKey) {
    return (
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center text-sm text-slate-500">
        {l("mapsNotConfigured", language)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full h-56 rounded-lg border border-slate-200 bg-slate-100"
        data-testid="map-container"
      />
      {!mapLoaded && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {l("loadingMap", language)}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={gettingLocation}
          data-testid="button-current-location"
        >
          {gettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <MapPin className="h-4 w-4 mr-1" />
          )}
          {l("currentLocation", language)}
        </Button>
        {latitude && longitude && (
          <span className="text-xs text-slate-500" data-testid="text-coordinates">
            {latitude}, {longitude}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400">{l("dragPinToSelect", language)}</p>
    </div>
  );
}

function JourneyTimeline({ logs, language }: { logs: GovSchoolLog[]; language: string }) {
  if (!logs || logs.length === 0) return null;

  const sorted = [...logs].sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

  return (
    <div className="space-y-0 mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-500">{l("journey", language)}</span>
      </div>
      <div className="relative pl-4 space-y-3">
        <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-slate-200" />
        {sorted.map((log, i) => (
          <div key={log.id} className="relative" data-testid={`journey-log-${log.id}`}>
            <div className={`absolute -left-4 top-1 w-3.5 h-3.5 rounded-full border-2 ${i === sorted.length - 1 ? "border-green-500 bg-green-100" : "border-slate-300 bg-white"}`} />
            <div className={`p-2 rounded-md border-l-2 ${actionColors[log.action] || "border-slate-300 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700 capitalize">{l(log.action, language)}</span>
                <span className="text-[10px] text-slate-400">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              {log.note && <p className="text-xs text-slate-600 mt-0.5">{log.note}</p>}
              {log.performedByName && <p className="text-[10px] text-slate-400 mt-0.5">{log.performedByName}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmissionCard({ submission, language }: { submission: SubmissionWithLogs; language: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-visible" data-testid={`submission-card-${submission.id}`}>
      <CardContent className="p-3 space-y-2">
        <button
          className="w-full text-left"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-submission-${submission.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{submission.schoolName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {submission.villageName} &middot; {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
              </p>
            </div>
            <Badge className={statusColors[submission.status] || ""}>
              {l(submission.status, language)}
            </Badge>
          </div>
          {submission.issueCategoryName && (
            <p className="text-xs text-slate-600 mt-1">{submission.issueCategoryName}</p>
          )}
          {submission.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{submission.description}</p>
          )}
        </button>

        {expanded && (
          <JourneyTimeline logs={submission.logs} language={language} />
        )}

        <button
          className="text-xs text-green-600 flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-toggle-journey-${submission.id}`}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          {expanded ? l("back", language) : l("journey", language)}
        </button>
      </CardContent>
    </Card>
  );
}

export default function TaskGovSchool({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [schoolName, setSchoolName] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalMobile, setPrincipalMobile] = useState("");
  const [principalOtpSent, setPrincipalOtpSent] = useState(false);
  const [principalOtp, setPrincipalOtp] = useState("");
  const [principalVerified, setPrincipalVerified] = useState(false);
  const [issueCategoryId, setIssueCategoryId] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [issueCategorySearch, setIssueCategorySearch] = useState("");
  const [nodalVolunteerName, setNodalVolunteerName] = useState("");
  const [nodalVolunteerMobile, setNodalVolunteerMobile] = useState("");
  const [nodalOtpSent, setNodalOtpSent] = useState(false);
  const [nodalOtp, setNodalOtp] = useState("");
  const [nodalVerified, setNodalVerified] = useState(false);
  const [descriptionText, setDescriptionText] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: mySubmissions } = useQuery<SubmissionWithLogs[]>({
    queryKey: ["/api/gov-school/my-submissions", user.id],
    enabled: !!user.id,
  });

  const { data: categoriesList } = useQuery<GovSchoolIssueCategory[]>({
    queryKey: ["/api/gov-school/categories"],
    enabled: step === "form",
  });

  const activeCategories = useMemo(() => (categoriesList || []).filter(c => c.isActive), [categoriesList]);

  const filteredCategories = useMemo(() => {
    if (!issueCategorySearch.trim()) return activeCategories;
    const q = issueCategorySearch.toLowerCase();
    return activeCategories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.nameHi && c.nameHi.toLowerCase().includes(q)) ||
      (c.namePa && c.namePa.toLowerCase().includes(q))
    );
  }, [activeCategories, issueCategorySearch]);

  const selectedCategoryName = useMemo(() => {
    const cat = activeCategories.find(c => c.id === issueCategoryId);
    if (!cat) return "";
    if (language === "hi" && cat.nameHi) return cat.nameHi;
    if (language === "pa" && cat.namePa) return cat.namePa;
    return cat.name;
  }, [activeCategories, issueCategoryId, language]);

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  const getCategoryDisplayName = (cat: GovSchoolIssueCategory) => {
    if (language === "hi" && cat.nameHi) return cat.nameHi;
    if (language === "pa" && cat.namePa) return cat.namePa;
    return cat.name;
  };

  const selectedCategoryNames = useMemo(() => {
    return selectedCategoryIds.map(id => {
      const cat = activeCategories.find(c => c.id === id);
      if (!cat) return "";
      if (language === "hi" && cat.nameHi) return cat.nameHi;
      if (language === "pa" && cat.namePa) return cat.namePa;
      return cat.name;
    }).filter(Boolean);
  }, [activeCategories, selectedCategoryIds, language]);

  const sendPrincipalOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gov-school/send-otp", { mobileNumber: principalMobile });
      return res.json();
    },
    onSuccess: () => {
      setPrincipalOtpSent(true);
      toast({ title: `${l("otpSentTo", language)} ${principalMobile}` });
    },
    onError: () => {
      toast({ title: l("failedToSendOtp", language), variant: "destructive" });
    },
  });

  const verifyPrincipalOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gov-school/verify-otp", { mobileNumber: principalMobile, otp: principalOtp });
      return res.json();
    },
    onSuccess: () => {
      setPrincipalVerified(true);
      toast({ title: l("principalMobileVerified", language) });
    },
    onError: () => {
      toast({ title: l("invalidOtp", language), variant: "destructive" });
    },
  });

  const sendNodalOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gov-school/send-otp", { mobileNumber: nodalVolunteerMobile });
      return res.json();
    },
    onSuccess: () => {
      setNodalOtpSent(true);
      toast({ title: `${l("otpSentTo", language)} ${nodalVolunteerMobile}` });
    },
    onError: () => {
      toast({ title: l("failedToSendOtp", language), variant: "destructive" });
    },
  });

  const verifyNodalOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gov-school/verify-otp", { mobileNumber: nodalVolunteerMobile, otp: nodalOtp });
      return res.json();
    },
    onSuccess: () => {
      setNodalVerified(true);
      toast({ title: l("nodalMobileVerified", language) });
    },
    onError: () => {
      toast({ title: l("invalidOtp", language), variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (audioNoteData: string | null) => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId,
        villageName: selectedVillageName,
        mobileNumber: principalMobile || "",
        mobileVerified: principalVerified,
        schoolName,
        principalName,
        principalMobile: principalMobile || null,
        issueCategoryId: selectedCategoryIds[0] || issueCategoryId || null,
        issueCategoryName: selectedCategoryNames[0] || selectedCategoryName || null,
        issueCategoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds.join(",") : null,
        issueCategoryNames: selectedCategoryNames.length > 0 ? selectedCategoryNames.join(", ") : null,
        nodalVolunteerName: nodalVolunteerName || null,
        nodalVolunteerMobile: nodalVolunteerMobile || null,
        description: descriptionText || null,
        audioNote: audioNoteData,
        latitude: latitude || null,
        longitude: longitude || null,
        locationAddress: null,
        status: "pending",
      };
      const res = await apiRequest("POST", "/api/gov-school/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gov-school/my-submissions", user.id] });
      toast({ title: l("submitted", language) });
      resetForm();
      setStep("description");
    },
    onError: () => {
      toast({ title: l("submissionFailed", language), variant: "destructive" });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: l("micDenied", language), variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const playAudio = () => {
    if (audioUrl) {
      new Audio(audioUrl).play();
    }
  };

  const deleteAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = async () => {
    if (!schoolName.trim()) {
      toast({ title: l("schoolNameRequired", language), variant: "destructive" });
      return;
    }
    if (!principalName.trim()) {
      toast({ title: l("principalNameRequired", language), variant: "destructive" });
      return;
    }
    if (!principalVerified) {
      toast({ title: l("principalMobileRequired", language), variant: "destructive" });
      return;
    }
    if (selectedCategoryIds.length === 0) {
      toast({ title: l("categoryRequired", language), variant: "destructive" });
      return;
    }
    if (nodalVolunteerMobile.length > 0 && !nodalVerified) {
      toast({ title: l("nodalMobileRequired", language), variant: "destructive" });
      return;
    }
    let audioNoteData: string | null = null;
    if (audioBlob) {
      audioNoteData = await blobToBase64(audioBlob);
    }
    submitMutation.mutate(audioNoteData);
  };

  const resetForm = () => {
    setSelectedVillageId("");
    setSelectedVillageName("");
    setSchoolName("");
    setPrincipalName("");
    setPrincipalMobile("");
    setPrincipalOtpSent(false);
    setPrincipalOtp("");
    setPrincipalVerified(false);
    setIssueCategoryId("");
    setSelectedCategoryIds([]);
    setIssueCategorySearch("");
    setNodalVolunteerName("");
    setNodalVolunteerMobile("");
    setNodalOtpSent(false);
    setNodalOtp("");
    setNodalVerified(false);
    setDescriptionText("");
    setLatitude("");
    setLongitude("");
    setAudioBlob(null);
    setAudioUrl(null);
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

  const handleLocationChange = useCallback((lat: string, lng: string) => {
    setLatitude(lat);
    setLongitude(lng);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-green-600 text-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white no-default-hover-elevate"
          onClick={step === "description" ? () => setLocation("/app") : handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold" data-testid="text-gov-school-title">{l("title", language)}</h1>
      </header>

      <div className="p-4 space-y-4">
        {step === "description" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <School className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800" data-testid="text-gov-school-heading">{l("title", language)}</h2>
                    <p className="text-sm text-slate-500 mt-1">{l("description", language)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={() => setStep("select_unit")}
              data-testid="button-new-submission"
            >
              <Send className="h-4 w-4 mr-2" />
              {l("newSubmission", language)}
            </Button>

            {mySubmissions && mySubmissions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider" data-testid="text-previous-submissions">
                    {l("previousSubmissions", language)} ({mySubmissions.length})
                  </h3>
                </div>
                {mySubmissions.map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} language={language} />
                ))}
              </div>
            )}

            {mySubmissions && mySubmissions.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <School className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">{l("noSubmissions", language)}</p>
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
            title={l("selectUnit", language)}
            subtitle={l("selectUnitSubtitle", language)}
            defaultVillageId={user.mappedAreaId || undefined}
          />
        )}

        {step === "form" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1 flex-wrap">
              <span className="text-sm text-slate-500">{selectedVillageName}</span>
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("schoolName", language)} *</label>
                  <Input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder={l("schoolName", language)}
                    data-testid="input-school-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("principalName", language)} *</label>
                  <Input
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder={l("principalName", language)}
                    data-testid="input-principal-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("principalMobile", language)}</label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      maxLength={10}
                      value={principalMobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setPrincipalMobile(val);
                        if (val !== principalMobile) {
                          setPrincipalVerified(false);
                          setPrincipalOtpSent(false);
                          setPrincipalOtp("");
                        }
                      }}
                      placeholder="9876543210"
                      disabled={principalVerified}
                      data-testid="input-principal-mobile"
                    />
                    {!principalVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => sendPrincipalOtpMutation.mutate()}
                        disabled={principalMobile.length !== 10 || sendPrincipalOtpMutation.isPending}
                        data-testid="button-send-principal-otp"
                      >
                        {sendPrincipalOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-1" />}
                        {l("sendOtp", language)}
                      </Button>
                    )}
                    {principalVerified && (
                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1 whitespace-nowrap" data-testid="badge-principal-verified">
                        <CheckCircle className="h-3 w-3" /> {l("verified", language)}
                      </Badge>
                    )}
                  </div>
                  {principalOtpSent && !principalVerified && (
                    <div className="space-y-2 pt-2 border-t border-green-200 bg-green-50 rounded-md p-3">
                      <p className="text-xs text-green-600" data-testid="text-principal-otp-sent">
                        {l("otpSentTo", language)} {principalMobile}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          maxLength={4}
                          value={principalOtp}
                          onChange={(e) => setPrincipalOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder={l("enterOtp", language)}
                          data-testid="input-principal-otp"
                        />
                        <Button
                          size="sm"
                          onClick={() => verifyPrincipalOtpMutation.mutate()}
                          disabled={principalOtp.length !== 4 || verifyPrincipalOtpMutation.isPending}
                          data-testid="button-verify-principal-otp"
                        >
                          {verifyPrincipalOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {l("verify", language)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("issueCategory", language)} *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder={l("searchCategory", language)}
                      value={issueCategorySearch}
                      onChange={(e) => setIssueCategorySearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-category"
                    />
                  </div>
                  {selectedCategoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedCategoryIds.map(id => {
                        const cat = activeCategories.find(c => c.id === id);
                        if (!cat) return null;
                        return (
                          <Badge
                            key={id}
                            className="bg-green-100 text-green-800 cursor-pointer gap-1"
                            onClick={() => toggleCategory(id)}
                            data-testid={`badge-selected-category-${id}`}
                          >
                            {getCategoryDisplayName(cat)} ✕
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCategoryIds.includes(cat.id) ? "bg-green-100 text-green-800 font-medium" : "hover-elevate"}`}
                        onClick={() => toggleCategory(cat.id)}
                        data-testid={`button-category-${cat.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${selectedCategoryIds.includes(cat.id) ? "bg-green-600 text-white border-green-600" : "border-slate-300"}`}>
                            {selectedCategoryIds.includes(cat.id) && "✓"}
                          </span>
                          {getCategoryDisplayName(cat)}
                        </span>
                      </button>
                    ))}
                    {filteredCategories.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">
                        {language === "hi" ? "कोई श्रेणी नहीं मिली" : language === "pa" ? "ਕੋਈ ਸ਼੍ਰੇਣੀ ਨਹੀਂ ਮਿਲੀ" : "No categories found"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("nodalVolunteerName", language)}</label>
                  <Input
                    value={nodalVolunteerName}
                    onChange={(e) => setNodalVolunteerName(e.target.value)}
                    placeholder={l("nodalVolunteerName", language)}
                    data-testid="input-nodal-volunteer-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("nodalVolunteerMobile", language)}</label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      maxLength={10}
                      value={nodalVolunteerMobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setNodalVolunteerMobile(val);
                        if (val !== nodalVolunteerMobile) {
                          setNodalVerified(false);
                          setNodalOtpSent(false);
                          setNodalOtp("");
                        }
                      }}
                      placeholder="9876543210"
                      disabled={nodalVerified}
                      data-testid="input-nodal-volunteer-mobile"
                    />
                    {!nodalVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => sendNodalOtpMutation.mutate()}
                        disabled={nodalVolunteerMobile.length !== 10 || sendNodalOtpMutation.isPending}
                        data-testid="button-send-nodal-otp"
                      >
                        {sendNodalOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-1" />}
                        {l("sendOtp", language)}
                      </Button>
                    )}
                    {nodalVerified && (
                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1 whitespace-nowrap" data-testid="badge-nodal-verified">
                        <CheckCircle className="h-3 w-3" /> {l("verified", language)}
                      </Badge>
                    )}
                  </div>
                  {nodalOtpSent && !nodalVerified && (
                    <div className="space-y-2 pt-2 border-t border-green-200 bg-green-50 rounded-md p-3">
                      <p className="text-xs text-green-600" data-testid="text-nodal-otp-sent">
                        {l("otpSentTo", language)} {nodalVolunteerMobile}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          maxLength={4}
                          value={nodalOtp}
                          onChange={(e) => setNodalOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder={l("enterOtp", language)}
                          data-testid="input-nodal-otp"
                        />
                        <Button
                          size="sm"
                          onClick={() => verifyNodalOtpMutation.mutate()}
                          disabled={nodalOtp.length !== 4 || verifyNodalOtpMutation.isPending}
                          data-testid="button-verify-nodal-otp"
                        >
                          {verifyNodalOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {l("verify", language)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("descriptionLabel", language)}</label>
                  <Textarea
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                    placeholder={l("descriptionPlaceholder", language)}
                    rows={4}
                    data-testid="textarea-description"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("audioNote", language)}</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isRecording && !audioBlob && (
                      <Button variant="outline" size="sm" onClick={startRecording} data-testid="button-start-recording">
                        <Mic className="h-4 w-4 mr-1" /> {l("record", language)}
                      </Button>
                    )}
                    {isRecording && (
                      <Button variant="outline" size="sm" onClick={stopRecording} className="text-red-600" data-testid="button-stop-recording">
                        <Square className="h-4 w-4 mr-1" /> {l("stop", language)}
                      </Button>
                    )}
                    {isRecording && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <MicOff className="h-3 w-3 animate-pulse" /> {l("recording", language)}
                      </span>
                    )}
                    {audioBlob && !isRecording && (
                      <>
                        <Button variant="outline" size="sm" onClick={playAudio} data-testid="button-play-audio">
                          <Play className="h-4 w-4 mr-1" /> {l("play", language)}
                        </Button>
                        <Button variant="outline" size="sm" onClick={deleteAudio} className="text-red-600" data-testid="button-delete-audio">
                          <Trash2 className="h-4 w-4 mr-1" /> {l("delete", language)}
                        </Button>
                        <span className="text-xs text-green-600">{l("recorded", language)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("location", language)}</label>
                  <GoogleMapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onLocationChange={handleLocationChange}
                    language={language}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              data-testid="button-submit-report"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {l("submitting", language)}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {l("submit", language)}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
