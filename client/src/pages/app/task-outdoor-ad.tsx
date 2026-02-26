import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation, type Language } from "@/lib/i18n";
import { ArrowLeft, Loader2, Phone, CheckCircle, MapPin, Send, Image as ImageIcon, ChevronRight, Camera, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, OutdoorAdSubmission } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "verify_mobile" | "form" | "submitted";

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Outdoor Advertisement", hi: "आउटडोर विज्ञापन", pa: "ਆਊਟਡੋਰ ਇਸ਼ਤਿਹਾਰ" },
  description: {
    en: "Submit details about outdoor advertisement locations including building owner information, wall measurements, frame type, and exact location via Google Maps.",
    hi: "आउटडोर विज्ञापन स्थानों के बारे में विवरण जमा करें, जिसमें भवन मालिक की जानकारी, दीवार का माप, फ्रेम का प्रकार और गूगल मैप्स के माध्यम से सटीक स्थान शामिल है।",
    pa: "ਆਊਟਡੋਰ ਇਸ਼ਤਿਹਾਰ ਸਥਾਨਾਂ ਬਾਰੇ ਵੇਰਵੇ ਜਮ੍ਹਾਂ ਕਰੋ, ਜਿਸ ਵਿੱਚ ਇਮਾਰਤ ਮਾਲਕ ਦੀ ਜਾਣਕਾਰੀ, ਕੰਧ ਦਾ ਆਕਾਰ, ਫਰੇਮ ਦੀ ਕਿਸਮ ਅਤੇ ਗੂਗਲ ਮੈਪਸ ਰਾਹੀਂ ਸਹੀ ਟਿਕਾਣਾ ਸ਼ਾਮਲ ਹੈ।",
  },
  startNewSubmission: { en: "Start New Submission", hi: "नया आवेदन शुरू करें", pa: "ਨਵੀਂ ਅਰਜ਼ੀ ਸ਼ੁਰੂ ਕਰੋ" },
  previousSubmissions: { en: "Your Submissions", hi: "आपकी जमा", pa: "ਤੁਹਾਡੇ ਜਮ੍ਹਾਂ" },
  noSubmissions: { en: "No submissions yet", hi: "अभी तक कोई जमा नहीं", pa: "ਅਜੇ ਕੋਈ ਜਮ੍ਹਾਂ ਨਹੀਂ" },
  selectUnit: { en: "Select Unit", hi: "इकाई चुनें", pa: "ਯੂਨਿਟ ਚੁਣੋ" },
  selectUnitSubtitle: { en: "Choose the village/ward where the advertisement will be placed", hi: "वह गांव/वार्ड चुनें जहां विज्ञापन लगाया जाएगा", pa: "ਉਹ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ ਜਿੱਥੇ ਇਸ਼ਤਿਹਾਰ ਲਗਾਇਆ ਜਾਵੇਗਾ" },
  verifyMobile: { en: "Verify Mobile Number", hi: "मोबाइल नंबर सत्यापित करें", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ" },
  verifyMobileSubtitle: { en: "Enter the building owner's mobile number to verify via OTP", hi: "OTP से सत्यापन के लिए भवन मालिक का मोबाइल नंबर दर्ज करें", pa: "OTP ਰਾਹੀਂ ਤਸਦੀਕ ਲਈ ਇਮਾਰਤ ਮਾਲਕ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  enterMobile: { en: "Enter building owner's 10-digit mobile number", hi: "भवन मालिक का 10 अंकों का मोबाइल नंबर दर्ज करें", pa: "ਇਮਾਰਤ ਮਾਲਕ ਦਾ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  enterOtp: { en: "Enter 4-digit OTP", hi: "4 अंकों का OTP दर्ज करें", pa: "4 ਅੰਕਾਂ ਦਾ OTP ਦਰਜ ਕਰੋ" },
  verifyOtp: { en: "Verify OTP", hi: "OTP सत्यापित करें", pa: "OTP ਤਸਦੀਕ ਕਰੋ" },
  otpSentTo: { en: "OTP sent to", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  otpVerified: { en: "Mobile number verified!", hi: "मोबाइल नंबर सत्यापित!", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ!" },
  invalidOtp: { en: "Invalid or expired OTP", hi: "अमान्य या समाप्त OTP", pa: "ਅਵੈਧ ਜਾਂ ਮਿਆਦ ਪੁੱਗੀ OTP" },
  failedToSendOtp: { en: "Failed to send OTP", hi: "OTP भेजने में विफल", pa: "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ" },
  submissionFailed: { en: "Submission failed", hi: "जमा करने में विफल", pa: "ਜਮ੍ਹਾਂ ਕਰਨ ਵਿੱਚ ਅਸਫਲ" },
  uploadFailed: { en: "Upload failed", hi: "अपलोड विफल", pa: "ਅੱਪਲੋਡ ਅਸਫਲ" },
  mapsNotConfigured: { en: "Google Maps API key not configured", hi: "गूगल मैप्स API कुंजी कॉन्फ़िगर नहीं है", pa: "ਗੂਗਲ ਮੈਪਸ API ਕੁੰਜੀ ਕੌਂਫਿਗਰ ਨਹੀਂ ਹੈ" },
  ownerName: { en: "Building Owner Name", hi: "भवन मालिक का नाम", pa: "ਇਮਾਰਤ ਮਾਲਕ ਦਾ ਨਾਮ" },
  ownerNamePlaceholder: { en: "Enter building owner's name", hi: "भवन मालिक का नाम दर्ज करें", pa: "ਇਮਾਰਤ ਮਾਲਕ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ" },
  mobileNumber: { en: "Mobile Number", hi: "मोबाइल नंबर", pa: "ਮੋਬਾਈਲ ਨੰਬਰ" },
  wallSize: { en: "Wall Size", hi: "दीवार का आकार", pa: "ਕੰਧ ਦਾ ਆਕਾਰ" },
  wallSizePlaceholder: { en: "e.g. 10x20 ft", hi: "जैसे 10x20 फीट", pa: "ਜਿਵੇਂ 10x20 ਫੁੱਟ" },
  frameType: { en: "Frame Type", hi: "फ्रेम का प्रकार", pa: "ਫਰੇਮ ਦੀ ਕਿਸਮ" },
  selectFrameType: { en: "Select frame type", hi: "फ्रेम का प्रकार चुनें", pa: "ਫਰੇਮ ਦੀ ਕਿਸਮ ਚੁਣੋ" },
  withFrame: { en: "With Frame", hi: "फ्रेम के साथ", pa: "ਫਰੇਮ ਨਾਲ" },
  withoutFrame: { en: "Without Frame", hi: "फ्रेम के बिना", pa: "ਫਰੇਮ ਤੋਂ ਬਿਨਾਂ" },
  location: { en: "Location", hi: "स्थान", pa: "ਟਿਕਾਣਾ" },
  selectLocation: { en: "Select location on map", hi: "मानचित्र पर स्थान चुनें", pa: "ਨਕਸ਼ੇ 'ਤੇ ਟਿਕਾਣਾ ਚੁਣੋ" },
  currentLocation: { en: "Use Current Location", hi: "वर्तमान स्थान का उपयोग करें", pa: "ਮੌਜੂਦਾ ਟਿਕਾਣਾ ਵਰਤੋ" },
  locationSelected: { en: "Location selected", hi: "स्थान चुना गया", pa: "ਟਿਕਾਣਾ ਚੁਣਿਆ ਗਿਆ" },
  submit: { en: "Submit", hi: "जमा करें", pa: "ਜਮ੍ਹਾਂ ਕਰੋ" },
  submitting: { en: "Submitting...", hi: "जमा हो रहा है...", pa: "ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ..." },
  submitted: { en: "Submitted Successfully!", hi: "सफलतापूर्वक जमा!", pa: "ਸਫਲਤਾਪੂਰਵਕ ਜਮ੍ਹਾਂ!" },
  submittedDesc: { en: "Your outdoor ad submission has been recorded", hi: "आपका आउटडोर विज्ञापन आवेदन दर्ज हो गया है", pa: "ਤੁਹਾਡੀ ਆਊਟਡੋਰ ਇਸ਼ਤਿਹਾਰ ਅਰਜ਼ੀ ਦਰਜ ਹੋ ਗਈ ਹੈ" },
  submitAnother: { en: "Submit Another", hi: "एक और जमा करें", pa: "ਇੱਕ ਹੋਰ ਜਮ੍ਹਾਂ ਕਰੋ" },
  goHome: { en: "Go to Home", hi: "होम पर जाएं", pa: "ਹੋਮ 'ਤੇ ਜਾਓ" },
  back: { en: "Back", hi: "वापस", pa: "ਵਾਪਸ" },
  pending: { en: "Pending", hi: "लंबित", pa: "ਬਕਾਇਆ" },
  approved: { en: "Approved", hi: "स्वीकृत", pa: "ਮਨਜ਼ੂਰ" },
  rejected: { en: "Rejected", hi: "अस्वीकृत", pa: "ਰੱਦ" },
  ownerNameRequired: { en: "Owner name is required", hi: "मालिक का नाम आवश्यक है", pa: "ਮਾਲਕ ਦਾ ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ" },
  wallSizeRequired: { en: "Wall size is required", hi: "दीवार का आकार आवश्यक है", pa: "ਕੰਧ ਦਾ ਆਕਾਰ ਲੋੜੀਂਦਾ ਹੈ" },
  frameTypeRequired: { en: "Frame type is required", hi: "फ्रेम का प्रकार आवश्यक है", pa: "ਫਰੇਮ ਦੀ ਕਿਸਮ ਲੋੜੀਂਦੀ ਹੈ" },
  locationRequired: { en: "Please select a location on the map", hi: "कृपया मानचित्र पर स्थान चुनें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਨਕਸ਼ੇ 'ਤੇ ਟਿਕਾਣਾ ਚੁਣੋ" },
  loadingMap: { en: "Loading map...", hi: "मानचित्र लोड हो रहा है...", pa: "ਨਕਸ਼ਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  dragPinToSelect: { en: "Drag the pin to select exact location", hi: "सटीक स्थान चुनने के लिए पिन खींचें", pa: "ਸਹੀ ਟਿਕਾਣਾ ਚੁਣਨ ਲਈ ਪਿੰਨ ਖਿੱਚੋ" },
  verified: { en: "Verified", hi: "सत्यापित", pa: "ਤਸਦੀਕਿਤ" },
  captureWallImage: { en: "Capture Wall Image *", hi: "दीवार की फोटो लें *", pa: "ਕੰਧ ਦੀ ਫੋਟੋ ਖਿੱਚੋ *" },
  captureWallImageDesc: { en: "Take a photo of the wall. Location will be set automatically.", hi: "दीवार की फोटो लें। स्थान अपने आप सेट हो जाएगा।", pa: "ਕੰਧ ਦੀ ਫੋਟੋ ਖਿੱਚੋ। ਟਿਕਾਣਾ ਆਪਣੇ ਆਪ ਸੈੱਟ ਹੋ ਜਾਵੇਗਾ।" },
  wallImageCaptured: { en: "Wall image captured", hi: "दीवार की फोटो ली गई", pa: "ਕੰਧ ਦੀ ਫੋਟੋ ਖਿੱਚੀ ਗਈ" },
  wallImageRequired: { en: "Please capture the wall image", hi: "कृपया दीवार की फोटो लें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਕੰਧ ਦੀ ਫੋਟੋ ਖਿੱਚੋ" },
  retakePhoto: { en: "Retake Photo", hi: "फोटो दोबारा लें", pa: "ਫੋਟੋ ਦੁਬਾਰਾ ਖਿੱਚੋ" },
  uploadPosterImage: { en: "Upload Poster Photo", hi: "पोस्टर फोटो अपलोड करें", pa: "ਪੋਸਟਰ ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ" },
  uploadPosterImageDesc: { en: "After poster is installed, upload a photo", hi: "पोस्टर लगने के बाद फोटो अपलोड करें", pa: "ਪੋਸਟਰ ਲੱਗਣ ਤੋਂ ਬਾਅਦ ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ" },
  posterUploaded: { en: "Poster photo uploaded!", hi: "पोस्टर फोटो अपलोड हो गई!", pa: "ਪੋਸਟਰ ਫੋਟੋ ਅੱਪਲੋਡ ਹੋ ਗਈ!" },
  posterImageExists: { en: "Poster photo uploaded", hi: "पोस्टर फोटो अपलोड है", pa: "ਪੋਸਟਰ ਫੋਟੋ ਅੱਪਲੋਡ ਹੈ" },
  uploading: { en: "Uploading...", hi: "अपलोड हो रहा है...", pa: "ਅੱਪਲੋਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  locationAutoSet: { en: "Location auto-set from photo", hi: "फोटो से स्थान अपने आप सेट हुआ", pa: "ਫੋਟੋ ਤੋਂ ਟਿਕਾਣਾ ਆਪਣੇ ਆਪ ਸੈੱਟ ਹੋਇਆ" },
};

function l(key: string, lang: string): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as Record<string, string>)[lang] || entry.en;
}

declare global {
  interface Window {
    google: any;
    initOutdoorAdMap: () => void;
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

    window.initOutdoorAdMap = () => {
      const lat = latitude ? parseFloat(latitude) : 30.34;
      const lng = longitude ? parseFloat(longitude) : 76.39;
      initMap(lat, lng);
    };

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initOutdoorAdMap`;
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

export default function TaskOutdoorAd({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [wallSize, setWallSize] = useState("");
  const [frameType, setFrameType] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [wallImage, setWallImage] = useState("");
  const wallImageInputRef = useRef<HTMLInputElement>(null);
  const posterImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPosterId, setUploadingPosterId] = useState<string | null>(null);

  const { data: mySubmissions } = useQuery<OutdoorAdSubmission[]>({
    queryKey: ["/api/outdoor-ad/my-submissions", user.id],
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/outdoor-ad/send-otp", {
        mobileNumber,
      });
      return res.json();
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({ title: `${l("otpSentTo", language)} ${mobileNumber}` });
    },
    onError: () => {
      toast({ title: l("failedToSendOtp", language), variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/outdoor-ad/verify-otp", {
        mobileNumber,
        otp,
      });
      return res.json();
    },
    onSuccess: () => {
      setMobileVerified(true);
      toast({ title: l("otpVerified", language) });
      setStep("form");
    },
    onError: () => {
      toast({ title: l("invalidOtp", language), variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId,
        villageName: selectedVillageName,
        ownerName,
        mobileNumber,
        mobileVerified,
        wallSize,
        frameType,
        wallImage: wallImage || null,
        latitude: latitude || null,
        longitude: longitude || null,
        locationAddress: null,
        status: "pending",
        adminNote: null,
      };
      const res = await apiRequest("POST", "/api/outdoor-ad/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/outdoor-ad/my-submissions", user.id],
      });
      setStep("submitted");
    },
    onError: () => {
      toast({ title: l("submissionFailed", language), variant: "destructive" });
    },
  });

  const posterUploadMutation = useMutation({
    mutationFn: async ({ id, posterImage }: { id: string; posterImage: string }) => {
      const res = await apiRequest("PATCH", `/api/outdoor-ad/submissions/${id}/upload-poster`, { posterImage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/outdoor-ad/my-submissions", user.id],
      });
      setUploadingPosterId(null);
      toast({ title: l("posterUploaded", language) });
    },
    onError: () => {
      setUploadingPosterId(null);
      toast({ title: l("uploadFailed", language), variant: "destructive" });
    },
  });

  const handleWallImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setWallImage(base64);
      toast({ title: l("wallImageCaptured", language) });
    };
    reader.readAsDataURL(file);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        toast({ title: l("locationAutoSet", language) });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  const handlePosterImageCapture = (e: React.ChangeEvent<HTMLInputElement>, submissionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPosterId(submissionId);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      posterUploadMutation.mutate({ id: submissionId, posterImage: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!ownerName.trim()) {
      toast({
        title: l("ownerNameRequired", language),
        variant: "destructive",
      });
      return;
    }
    if (!wallSize.trim()) {
      toast({
        title: l("wallSizeRequired", language),
        variant: "destructive",
      });
      return;
    }
    if (!frameType) {
      toast({
        title: l("frameTypeRequired", language),
        variant: "destructive",
      });
      return;
    }
    if (!wallImage) {
      toast({
        title: l("wallImageRequired", language),
        variant: "destructive",
      });
      return;
    }
    if (!latitude || !longitude) {
      toast({
        title: l("locationRequired", language),
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  const handleBack = () => {
    switch (step) {
      case "select_unit":
        setStep("description");
        break;
      case "verify_mobile":
        setStep("select_unit");
        break;
      case "form":
        setStep("verify_mobile");
        break;
      case "submitted":
        setStep("form");
        break;
      default:
        setLocation("/app");
    }
  };

  const resetForm = () => {
    setStep("description");
    setSelectedVillageId("");
    setSelectedVillageName("");
    setOwnerName("");
    setMobileNumber("");
    setMobileVerified(false);
    setOtpSent(false);
    setOtp("");
    setWallSize("");
    setFrameType("");
    setLatitude("");
    setLongitude("");
    setWallImage("");
  };

  const handleLocationChange = useCallback((lat: string, lng: string) => {
    setLatitude(lat);
    setLongitude(lng);
  }, []);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white no-default-hover-elevate"
          onClick={step === "description" ? () => setLocation("/app") : handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold" data-testid="text-outdoor-ad-title">
          {l("title", language)}
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {step === "description" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-800" data-testid="text-outdoor-ad-heading">
                    {l("title", language)}
                  </h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed" data-testid="text-outdoor-ad-description">
                  {l("description", language)}
                </p>
                <Button
                  className="w-full"
                  onClick={() => setStep("select_unit")}
                  data-testid="button-start-submission"
                >
                  {l("startNewSubmission", language)}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {mySubmissions && mySubmissions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1" data-testid="text-previous-submissions-heading">
                  {l("previousSubmissions", language)}
                </h3>
                {mySubmissions.map((sub) => (
                  <Card key={sub.id} data-testid={`outdoor-ad-submission-${sub.id}`}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-medium" data-testid={`text-owner-name-${sub.id}`}>
                            {sub.ownerName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {sub.villageName} - {sub.wallSize} -{" "}
                            {sub.frameType === "with_frame"
                              ? l("withFrame", language)
                              : l("withoutFrame", language)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {sub.createdAt
                              ? new Date(sub.createdAt).toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                        <Badge
                          className={statusColors[sub.status] || ""}
                          data-testid={`badge-status-${sub.id}`}
                        >
                          {l(sub.status, language)}
                        </Badge>
                      </div>
                      {sub.adminNote && (
                        <p className="text-xs text-slate-600 bg-slate-100 p-2 rounded">
                          {sub.adminNote}
                        </p>
                      )}
                      {sub.wallImage && (
                        <img
                          src={`/api/outdoor-ad/submissions/${sub.id}/wall-image`}
                          alt="Wall"
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                          data-testid={`img-wall-${sub.id}`}
                        />
                      )}
                      {sub.posterImage ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" /> {l("posterImageExists", language)}
                          </Badge>
                          <img
                            src={`/api/outdoor-ad/submissions/${sub.id}/poster-image`}
                            alt="Poster"
                            className="w-20 h-20 object-cover rounded border border-slate-200"
                            data-testid={`img-poster-${sub.id}`}
                          />
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            id={`poster-input-${sub.id}`}
                            onChange={(e) => handlePosterImageCapture(e, sub.id)}
                            data-testid={`input-poster-${sub.id}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-blue-600 border-blue-200"
                            disabled={uploadingPosterId === sub.id}
                            onClick={() => document.getElementById(`poster-input-${sub.id}`)?.click()}
                            data-testid={`button-upload-poster-${sub.id}`}
                          >
                            {uploadingPosterId === sub.id ? (
                              <><Loader2 className="h-3 w-3 animate-spin mr-1" /> {l("uploading", language)}</>
                            ) : (
                              <><Upload className="h-3 w-3 mr-1" /> {l("uploadPosterImage", language)}</>
                            )}
                          </Button>
                          <p className="text-xs text-slate-400 mt-1">{l("uploadPosterImageDesc", language)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {mySubmissions && mySubmissions.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4" data-testid="text-no-submissions">
                {l("noSubmissions", language)}
              </p>
            )}
          </div>
        )}

        {step === "select_unit" && (
          <UnitSelector
            onSelect={(unit) => {
              setSelectedVillageId(unit.villageId);
              setSelectedVillageName(unit.villageName);
              setStep("verify_mobile");
            }}
            title={l("selectUnit", language)}
            subtitle={l("selectUnitSubtitle", language)}
            defaultVillageId={user.mappedAreaId || undefined}
          />
        )}

        {step === "verify_mobile" && (
          <div className="space-y-4">
            <div className="px-1">
              <h2 className="text-lg font-semibold text-slate-800" data-testid="text-verify-mobile-title">
                {l("verifyMobile", language)}
              </h2>
              <p className="text-sm text-slate-500">
                {l("verifyMobileSubtitle", language)}
              </p>
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <label className="text-sm font-medium text-slate-700">
                      {l("enterMobile", language)}
                    </label>
                  </div>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="9876543210"
                    data-testid="input-mobile-number"
                  />
                  <Button
                    className="w-full"
                    onClick={() => sendOtpMutation.mutate()}
                    disabled={mobileNumber.length !== 10 || sendOtpMutation.isPending}
                    data-testid="button-send-otp"
                  >
                    {sendOtpMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {l("sendOtp", language)}
                  </Button>
                </div>

                {otpSent && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs text-green-600" data-testid="text-otp-sent">
                      {l("otpSentTo", language)} {mobileNumber}
                    </p>
                    <Input
                      type="text"
                      maxLength={4}
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder={l("enterOtp", language)}
                      data-testid="input-otp"
                    />
                    <Button
                      className="w-full"
                      onClick={() => verifyOtpMutation.mutate()}
                      disabled={otp.length !== 4 || verifyOtpMutation.isPending}
                      data-testid="button-verify-otp"
                    >
                      {verifyOtpMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {l("verifyOtp", language)}
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1 flex-wrap">
              <Badge className="bg-blue-100 text-blue-800">
                {selectedVillageName}
              </Badge>
              {mobileVerified && (
                <Badge className="bg-green-100 text-green-800" data-testid="badge-mobile-verified">
                  <CheckCircle className="h-3 w-3 mr-1" /> {l("verified", language)}
                </Badge>
              )}
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {l("ownerName", language)} *
                  </label>
                  <Input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={l("ownerNamePlaceholder", language)}
                    data-testid="input-owner-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {l("mobileNumber", language)}
                  </label>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="9876543210"
                    disabled={mobileVerified}
                    data-testid="input-form-mobile"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {l("wallSize", language)} *
                  </label>
                  <Input
                    value={wallSize}
                    onChange={(e) => setWallSize(e.target.value)}
                    placeholder={l("wallSizePlaceholder", language)}
                    data-testid="input-wall-size"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {l("frameType", language)} *
                  </label>
                  <Select value={frameType} onValueChange={setFrameType}>
                    <SelectTrigger data-testid="select-frame-type">
                      <SelectValue placeholder={l("selectFrameType", language)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="with_frame" data-testid="option-with-frame">
                        {l("withFrame", language)}
                      </SelectItem>
                      <SelectItem value="without_frame" data-testid="option-without-frame">
                        {l("withoutFrame", language)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {l("captureWallImage", language)}
                  </label>
                  <p className="text-xs text-slate-500">{l("captureWallImageDesc", language)}</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={wallImageInputRef}
                    onChange={handleWallImageCapture}
                    className="hidden"
                    data-testid="input-wall-image"
                  />
                  {!wallImage ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2"
                      onClick={() => wallImageInputRef.current?.click()}
                      data-testid="button-capture-wall"
                    >
                      <Camera className="h-8 w-8 text-slate-400" />
                      <span className="text-sm text-slate-500">{l("captureWallImage", language)}</span>
                    </Button>
                  ) : (
                    <div className="relative">
                      <img
                        src={wallImage}
                        alt="Wall"
                        className="w-full h-48 object-cover rounded-lg border border-slate-200"
                        data-testid="img-wall-preview"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" /> {l("wallImageCaptured", language)}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setWallImage("");
                            if (wallImageInputRef.current) wallImageInputRef.current.value = "";
                            wallImageInputRef.current?.click();
                          }}
                          data-testid="button-retake-wall"
                        >
                          <Camera className="h-3 w-3 mr-1" /> {l("retakePhoto", language)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {l("location", language)} *
                  </label>
                  <GoogleMapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onLocationChange={handleLocationChange}
                    language={language}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
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
              </CardContent>
            </Card>
          </div>
        )}

        {step === "submitted" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800" data-testid="text-submitted-title">
                {l("submitted", language)}
              </h2>
              <p className="text-sm text-slate-500 mt-1" data-testid="text-submitted-desc">
                {l("submittedDesc", language)}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={resetForm}
                data-testid="button-submit-another"
              >
                {l("submitAnother", language)}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/app")}
                data-testid="button-go-home"
              >
                {l("goHome", language)}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
