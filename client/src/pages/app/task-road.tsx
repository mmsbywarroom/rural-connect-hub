import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Send,
  MapPin,
  Camera,
  Upload,
  Mic,
  StopCircle,
  Play,
  ChevronRight,
  Route as RouteIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, RoadReport } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "verify_mobile" | "form" | "submitted";

type RoadReportWithLogs = RoadReport & {
  logs?: {
    id: string;
    reportId: string;
    action: string;
    note: string | null;
    performedBy: string | null;
    performedByName: string | null;
    createdAt: string | null;
  }[];
};

const labels = {
  title: {
    en: "Road Condition Report",
    hi: "सड़क खराबी रिपोर्ट",
    pa: "ਸੜਕ ਖਰਾਬੀ ਰਿਪੋਰਟ",
  },
  description: {
    en: "Report broken or damaged roads in your unit with photos, video, audio note and exact start–end location on map.",
    hi: "अपने क्षेत्र में टूटी या खराब सड़कों की रिपोर्ट करें – फोटो, वीडियो, ऑडियो नोट और नक्शे पर शुरू से अंत तक का सटीक स्थान के साथ।",
    pa: "ਆਪਣੇ ਇਲਾਕੇ ਵਿਚ ਟੁੱਟੀਆਂ ਜਾਂ ਖਰਾਬ ਸੜਕਾਂ ਦੀ ਰਿਪੋਰਟ ਕਰੋ – ਫੋਟੋ, ਵੀਡੀਓ, ਆਡੀਓ ਨੋਟ ਅਤੇ ਨਕਸ਼ੇ 'ਤੇ ਸ਼ੁਰੂ ਤੋਂ ਅੰਤ ਤੱਕ ਦੇ ਸਹੀ ਟਿਕਾਣੇ ਨਾਲ।",
  },
  unitHeading: {
    en: "Select Unit (Village/Ward)",
    hi: "यूनिट चुनें (गांव/वार्ड)",
    pa: "ਯੂਨਿਟ ਚੁਣੋ (ਪਿੰਡ/ਵਾਰਡ)",
  },
  unitSubtitle: {
    en: "Select the exact village/ward where the road is damaged.",
    hi: "वही गांव/वार्ड चुनें जहां सड़क खराब है।",
    pa: "ਉਹੀ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ ਜਿੱਥੇ ਸੜਕ ਖਰਾਬ ਹੈ।",
  },
  verifyMobile: {
    en: "Verify Mobile Number",
    hi: "मोबाइल नंबर सत्यापित करें",
    pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ",
  },
  verifyMobileSubtitle: {
    en: "Enter your 10-digit mobile number. We will verify using OTP.",
    hi: "अपना 10 अंकों का मोबाइल नंबर दर्ज करें। हम OTP से सत्यापन करेंगे।",
    pa: "ਆਪਣਾ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ। ਅਸੀਂ OTP ਨਾਲ ਤਸਦੀਕ ਕਰਾਂਗੇ।",
  },
  reporterName: {
    en: "Your Name",
    hi: "आपका नाम",
    pa: "ਤੁਹਾਡਾ ਨਾਮ",
  },
  reporterNamePlaceholder: {
    en: "Enter your full name",
    hi: "अपना पूरा नाम दर्ज करें",
    pa: "ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਦਰਜ ਕਰੋ",
  },
  mobileNumberLabel: {
    en: "Mobile Number",
    hi: "मोबाइल नंबर",
    pa: "ਮੋਬਾਈਲ ਨੰਬਰ",
  },
  enterMobile: {
    en: "Enter your 10-digit mobile number",
    hi: "अपना 10 अंकों का मोबाइल नंबर दर्ज करें",
    pa: "ਆਪਣਾ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ",
  },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  enterOtp: { en: "Enter 4-digit OTP", hi: "4 अंकों का OTP दर्ज करें", pa: "4 ਅੰਕਾਂ ਦਾ OTP ਦਰਜ ਕਰੋ" },
  verifyOtp: { en: "Verify OTP", hi: "OTP सत्यापित करें", pa: "OTP ਤਸਦੀਕ ਕਰੋ" },
  otpSentTo: { en: "OTP sent to", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  otpVerified: { en: "Mobile number verified!", hi: "मोबाइल नंबर सत्यापित!", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ!" },
  invalidOtp: { en: "Invalid or expired OTP", hi: "अमान्य या समाप्त OTP", pa: "ਅਵੈਧ ਜਾਂ ਮਿਆਦ ਪੁੱਗੀ OTP" },
  failedToSendOtp: { en: "Failed to send OTP", hi: "OTP भेजने में विफल", pa: "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ" },
  roadDetailsHeading: {
    en: "Road Details",
    hi: "सड़क का विवरण",
    pa: "ਸੜਕ ਦਾ ਵੇਰਵਾ",
  },
  descriptionLabel: {
    en: "Describe the road problem",
    hi: "सड़क की समस्या का विवरण लिखें",
    pa: "ਸੜਕ ਦੀ ਸਮੱਸਿਆ ਬਾਰੇ ਲਿਖੋ",
  },
  descriptionPlaceholder: {
    en: "Example: Big potholes from school gate till main chowk, water logging, very difficult for ambulance, etc.",
    hi: "उदाहरण: स्कूल गेट से मुख्य चौक तक बड़े गड्ढे, पानी भराव, एम्बुलेंस के लिए दिक्कत आदि।",
    pa: "ਉਦਾਹਰਨ: ਸਕੂਲ ਗੇਟ ਤੋਂ ਮੁੱਖ ਚੌਕ ਤੱਕ ਵੱਡੇ ਖੱਡੇ, ਪਾਣੀ ਖੜਾ ਹੋਣਾ, ਐਂਬੂਲੈਂਸ ਲਈ ਮੁਸ਼ਕਲ ਆਦਿ।",
  },
  capturePhotos: {
    en: "Capture / Upload Road Photos *",
    hi: "सड़क की फोटो कैप्चर / अपलोड करें *",
    pa: "ਸੜਕ ਦੀਆਂ ਫੋਟੋਆਂ ਕੈਪਚਰ / ਅੱਪਲੋਡ ਕਰੋ *",
  },
  photosHint: {
    en: "Add multiple clear photos showing damage from different angles.",
    hi: "नुकसान को अलग-अलग एंगल से दिखाती हुई कई साफ फोटो जोड़ें।",
    pa: "ਨੁਕਸਾਨ ਨੂੰ ਵੱਖ-ਵੱਖ ਕੋਣਾਂ ਤੋਂ ਦਿਖਾਉਂਦੀਆਂ ਕਈ ਸਾਫ਼ ਫੋਟੋਆਂ ਜੋੜੋ।",
  },
  addVideo: {
    en: "Add Short Video (optional)",
    hi: "छोटा वीडियो जोड़ें (ऐच्छिक)",
    pa: "ਛੋਟਾ ਵੀਡੀਓ ਜੋੜੋ (ਇੱਛਿਕ)",
  },
  addAudio: {
    en: "Record Audio Note (optional)",
    hi: "ऑडियो नोट रिकॉर्ड करें (ऐच्छिक)",
    pa: "ਆਡੀਓ ਨੋਟ ਰਿਕਾਰਡ ਕਰੋ (ਇੱਛਿਕ)",
  },
  startRecording: { en: "Start Recording", hi: "रिकॉर्डिंग शुरू करें", pa: "ਰਿਕਾਰਡਿੰਗ ਸ਼ੁਰੂ ਕਰੋ" },
  stopRecording: { en: "Stop Recording", hi: "रिकॉर्डिंग रोकें", pa: "ਰਿਕਾਰਡਿੰਗ ਰੋਕੋ" },
  playAudio: { en: "Play", hi: "चलाएँ", pa: "ਚਲਾਓ" },
  deleteAudio: { en: "Delete", hi: "हटाएँ", pa: "ਹਟਾਓ" },
  mapHeading: {
    en: "Mark Road on Map",
    hi: "नक्शे पर सड़क चिन्हित करें",
    pa: "ਨਕਸ਼ੇ 'ਤੇ ਸੜਕ ਨਿਸ਼ਾਨ ਲਗਾਓ",
  },
  mapSubheading: {
    en: "Use current location and then mark START and END points of the damaged stretch.",
    hi: "वर्तमान लोकेशन से शुरू करें और खराब सड़क के शुरू और अंत बिंदु नक्शे पर चिन्हित करें।",
    pa: "ਮੌਜੂਦਾ ਟਿਕਾਣੇ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਖਰਾਬ ਸੜਕ ਦੇ ਸ਼ੁਰੂ ਅਤੇ ਅੰਤ ਬਿੰਦੂ ਨਕਸ਼ੇ 'ਤੇ ਨਿਸ਼ਾਨ ਲਗਾਓ।",
  },
  useCurrentLocation: {
    en: "Use Current Location",
    hi: "वर्तमान लोकेशन का उपयोग करें",
    pa: "ਮੌਜੂਦਾ ਟਿਕਾਣਾ ਵਰਤੋ",
  },
  selectStart: {
    en: "Select START point",
    hi: "START बिंदु चुनें",
    pa: "START ਬਿੰਦੂ ਚੁਣੋ",
  },
  selectEnd: {
    en: "Select END point",
    hi: "END बिंदु चुनें",
    pa: "END ਬਿੰਦੂ ਚੁਣੋ",
  },
  distanceLabel: {
    en: "Approx. damaged length",
    hi: "लगभग खराब सड़क की लंबाई",
    pa: "ਲਗਭਗ ਖਰਾਬ ਸੜਕ ਦੀ ਲੰਬਾਈ",
  },
  lengthInKm: {
    en: "km",
    hi: "कि.मी.",
    pa: "ਕਿਮੀ",
  },
  submit: { en: "Submit Report", hi: "रिपोर्ट सबमिट करें", pa: "ਰਿਪੋਰਟ ਜਮ੍ਹਾਂ ਕਰੋ" },
  submitting: { en: "Submitting...", hi: "सबमिट हो रहा है...", pa: "ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ..." },
  submittedTitle: {
    en: "Road report submitted",
    hi: "सड़क रिपोर्ट सबमिट हो गई",
    pa: "ਸੜਕ ਰਿਪੋਰਟ ਜਮ੍ਹਾਂ ਹੋ ਗਈ",
  },
  submittedDesc: {
    en: "Admin team will review and process it. You can track notes below.",
    hi: "एडमिन टीम इसे देखेगी और आगे की कार्रवाई करेगी। नीचे नोट्स में स्थिति देख सकते हैं।",
    pa: "ਐਡਮਿਨ ਟੀਮ ਇਸਨੂੰ ਦੇਖ ਕੇ ਕਾਰਵਾਈ ਕਰੇਗੀ। ਤੁਸੀਂ ਹੇਠਾਂ ਨੋਟਾਂ ਵਿੱਚ ਸਥਿਤੀ ਦੇਖ ਸਕਦੇ ਹੋ।",
  },
  submitAnother: { en: "Submit Another", hi: "एक और रिपोर्ट करें", pa: "ਇੱਕ ਹੋਰ ਰਿਪੋਰਟ ਕਰੋ" },
  goHome: { en: "Go to Home", hi: "होम पर जाएं", pa: "ਹੋਮ 'ਤੇ ਜਾਓ" },
  previousReports: {
    en: "Your Road Reports",
    hi: "आपकी सड़क रिपोर्टें",
    pa: "ਤੁਹਾਡੀਆਂ ਸੜਕ ਰਿਪੋਰਟਾਂ",
  },
  noReports: {
    en: "You have not submitted any road report yet.",
    hi: "आपने अभी तक कोई सड़क रिपोर्ट सबमिट नहीं की है।",
    pa: "ਤੁਸੀਂ ਅਜੇ ਤੱਕ ਕੋਈ ਸੜਕ ਰਿਪੋਰਟ ਜਮ੍ਹਾਂ ਨਹੀਂ ਕੀਤੀ।",
  },
  journey: { en: "Journey / Notes", hi: "यात्रा / नोट्स", pa: "ਜਰਨੀ / ਨੋਟਸ" },
  pending: { en: "Pending", hi: "लंबित", pa: "ਬਕਾਇਆ" },
  in_progress: { en: "In Progress", hi: "प्रगति पर", pa: "ਚੱਲ ਰਹੀ" },
  completed: { en: "Completed", hi: "पूरा", pa: "ਪੂਰਾ" },
  nameRequired: {
    en: "Name is required",
    hi: "नाम आवश्यक है",
    pa: "ਨਾਮ ਲਾਜ਼ਮੀ ਹੈ",
  },
  unitRequired: {
    en: "Please select unit (village/ward)",
    hi: "कृपया यूनिट (गांव/वार्ड) चुनें",
    pa: "ਕਿਰਪਾ ਕਰਕੇ ਯੂਨਿਟ (ਪਿੰਡ/ਵਾਰਡ) ਚੁਣੋ",
  },
  descriptionRequired: {
    en: "Please describe the road problem",
    hi: "कृपया सड़क की समस्या का विवरण लिखें",
    pa: "ਕਿਰਪਾ ਕਰਕੇ ਸੜਕ ਦੀ ਸਮੱਸਿਆ ਬਾਰੇ ਲਿਖੋ",
  },
  photosRequired: {
    en: "Please add at least one photo of the road",
    hi: "कृपया सड़क की कम से कम एक फोटो जोड़ें",
    pa: "ਕਿਰਪਾ ਕਰਕੇ ਸੜਕ ਦੀ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਫੋਟੋ ਜੋੜੋ",
  },
  mapRequired: {
    en: "Please mark both START and END points on the map",
    hi: "कृपया नक्शे पर START और END दोनों बिंदु चिन्हित करें",
    pa: "ਕਿਰਪਾ ਕਰਕੇ ਨਕਸ਼ੇ 'ਤੇ START ਅਤੇ END ਦੋਵੇਂ ਬਿੰਦੂ ਨਿਸ਼ਾਨ ਲਗਾਓ",
  },
  submissionFailed: {
    en: "Failed to submit report",
    hi: "रिपोर्ट सबमिट करने में समस्या आई",
    pa: "ਰਿਪੋਰਟ ਜਮ੍ਹਾਂ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ",
  },
};

function l(key: keyof typeof labels, lang: string): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as any)[lang] || entry.en;
}

declare global {
  interface Window {
    google: any;
    initRoadMap: () => void;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function RoadMapPicker({
  startLatitude,
  startLongitude,
  endLatitude,
  endLongitude,
  onChange,
  language,
}: {
  startLatitude: string;
  startLongitude: string;
  endLatitude: string;
  endLongitude: string;
  onChange: (data: {
    startLatitude: string;
    startLongitude: string;
    endLatitude: string;
    endLongitude: string;
    distanceKm: string | null;
  }) => void;
  language: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mode, setMode] = useState<"start" | "end">("start");

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const updateAndNotify = useCallback(
    (sLat: string, sLng: string, eLat: string, eLng: string) => {
      let distanceKm: string | null = null;
      if (sLat && sLng && eLat && eLng) {
        const d = haversineKm(parseFloat(sLat), parseFloat(sLng), parseFloat(eLat), parseFloat(eLng));
        distanceKm = d.toFixed(2);
      }
      onChange({
        startLatitude: sLat,
        startLongitude: sLng,
        endLatitude: eLat,
        endLongitude: eLng,
        distanceKm,
      });
    },
    [onChange]
  );

  const initMap = useCallback(
    (lat: number, lng: number) => {
      if (!mapRef.current || !window.google) return;

      const center = { lat, lng };
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });

      const createOrUpdateMarker = (type: "start" | "end", position: { lat: number; lng: number }) => {
        const ref = type === "start" ? startMarkerRef : endMarkerRef;
        if (ref.current) {
          ref.current.setPosition(position);
        } else {
          const marker = new window.google.maps.Marker({
            position,
            map,
            draggable: true,
            label: type === "start" ? "S" : "E",
          });
          marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            if (!pos) return;
            const newLat = pos.lat().toFixed(6);
            const newLng = pos.lng().toFixed(6);
            const sLat = type === "start" ? newLat : startLatitude;
            const sLng = type === "start" ? newLng : startLongitude;
            const eLat = type === "end" ? newLat : endLatitude;
            const eLng = type === "end" ? newLng : endLongitude;
            updateAndNotify(sLat || "", sLng || "", eLat || "", eLng || "");
          });
          ref.current = marker;
        }
      };

      map.addListener("click", (e: any) => {
        const clickLat = e.latLng.lat();
        const clickLng = e.latLng.lng();
        if (mode === "start") {
          createOrUpdateMarker("start", { lat: clickLat, lng: clickLng });
          updateAndNotify(clickLat.toFixed(6), clickLng.toFixed(6), endLatitude || "", endLongitude || "");
        } else {
          createOrUpdateMarker("end", { lat: clickLat, lng: clickLng });
          updateAndNotify(startLatitude || "", startLongitude || "", clickLat.toFixed(6), clickLng.toFixed(6));
        }
      });

      // Initialize markers if we already have coordinates
      if (startLatitude && startLongitude) {
        createOrUpdateMarker("start", { lat: parseFloat(startLatitude), lng: parseFloat(startLongitude) });
      }
      if (endLatitude && endLongitude) {
        createOrUpdateMarker("end", { lat: parseFloat(endLatitude), lng: parseFloat(endLongitude) });
      }

      mapInstanceRef.current = map;
      setMapLoaded(true);
    },
    [endLatitude, endLongitude, mode, startLatitude, startLongitude, updateAndNotify]
  );

  useEffect(() => {
    if (!apiKey) return;

    if (window.google && window.google.maps) {
      const lat = startLatitude ? parseFloat(startLatitude) : 30.34;
      const lng = startLongitude ? parseFloat(startLongitude) : 76.39;
      initMap(lat, lng);
      return;
    }

    window.initRoadMap = () => {
      const lat = startLatitude ? parseFloat(startLatitude) : 30.34;
      const lng = startLongitude ? parseFloat(startLongitude) : 76.39;
      initMap(lat, lng);
    };

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initRoadMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      if (window.google && window.google.maps) {
        const lat = startLatitude ? parseFloat(startLatitude) : 30.34;
        const lng = startLongitude ? parseFloat(startLongitude) : 76.39;
        initMap(lat, lng);
      }
    }
  }, [apiKey, initMap, startLatitude, startLongitude]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
        }
        if (mode === "start") {
          updateAndNotify(lat.toFixed(6), lng.toFixed(6), endLatitude || "", endLongitude || "");
        } else {
          updateAndNotify(startLatitude || "", startLongitude || "", lat.toFixed(6), lng.toFixed(6));
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
        Google Maps API key not configured.
      </div>
    );
  }

  let distanceText = "";
  if (startLatitude && startLongitude && endLatitude && endLongitude) {
    const d = haversineKm(parseFloat(startLatitude), parseFloat(startLongitude), parseFloat(endLatitude), parseFloat(endLongitude));
    distanceText = `${d.toFixed(2)} ${l("lengthInKm", language)}`;
  }

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className="w-full h-56 rounded-lg border border-slate-200 bg-slate-100"
        data-testid="map-road-container"
      />
      {!mapLoaded && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading map...
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={gettingLocation}
        >
          {gettingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MapPin className="h-4 w-4 mr-1" />}
          {l("useCurrentLocation", language)}
        </Button>
        <Button
          variant={mode === "start" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("start")}
        >
          {l("selectStart", language)}
        </Button>
        <Button
          variant={mode === "end" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("end")}
        >
          {l("selectEnd", language)}
        </Button>
        {distanceText && (
          <span className="text-xs text-slate-600">
            {l("distanceLabel", language)}: <span className="font-semibold">{distanceText}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function JourneyTimeline({ logs, language }: { logs: NonNullable<RoadReportWithLogs["logs"]>; language: string }) {
  if (!logs || logs.length === 0) return null;
  const sorted = [...logs].sort(
    (a, b) => new Date(a.createdAt || "").getTime() - new Date(b.createdAt || "").getTime()
  );
  const actionColor: Record<string, string> = {
    submitted: "border-slate-300 bg-slate-50",
    note: "border-blue-300 bg-blue-50",
    completed: "border-green-400 bg-green-50",
  };
  return (
    <div className="space-y-1 mt-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <RouteIcon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-500">{l("journey", language)}</span>
      </div>
      <div className="relative pl-4 space-y-3">
        <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-slate-200" />
        {sorted.map((log, i) => (
          <div key={log.id} className="relative">
            <div
              className={`absolute -left-4 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                i === sorted.length - 1 ? "border-green-500 bg-green-100" : "border-slate-300 bg-white"
              }`}
            />
            <div className={`p-2 rounded-md border-l-2 ${actionColor[log.action] || "border-slate-300 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700 capitalize">
                  {log.action === "note" ? "Note" : log.action === "submitted" ? "Submitted" : "Completed"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
              {log.note && <p className="text-xs text-slate-600 mt-0.5">{log.note}</p>}
              {log.performedByName && (
                <p className="text-[10px] text-slate-400 mt-0.5">{log.performedByName}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report, language }: { report: RoadReportWithLogs; language: string }) {
  const [expanded, setExpanded] = useState(false);
  const created = report.createdAt ? new Date(report.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) : "";

  return (
    <Card className="overflow-visible" data-testid={`road-report-card-${report.id}`}>
      <CardContent className="p-3 space-y-2">
        <button
          className="w-full text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {report.villageName || "—"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {created}
              </p>
              {report.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {report.description}
                </p>
              )}
            </div>
            <Badge>
              {l(report.status as any, language)}
            </Badge>
          </div>
        </button>

        {expanded && report.logs && (
          <JourneyTimeline logs={report.logs} language={language} />
        )}

        <button
          className="text-xs text-blue-600 flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          {expanded ? "Hide journey" : "View journey"}
        </button>
      </CardContent>
    </Card>
  );
}

export default function TaskRoad({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [reporterName, setReporterName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [startLatitude, setStartLatitude] = useState("");
  const [startLongitude, setStartLongitude] = useState("");
  const [endLatitude, setEndLatitude] = useState("");
  const [endLongitude, setEndLongitude] = useState("");
  const [distanceKm, setDistanceKm] = useState<string | null>(null);

  const { data: myReports } = useQuery<RoadReportWithLogs[]>({
    queryKey: ["/api/road/my-reports", user.id],
    enabled: !!user.id,
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/road/send-otp", { mobileNumber });
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
      const res = await apiRequest("POST", "/api/road/verify-otp", { mobileNumber, otp });
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
    mutationFn: async (audioNoteData: string | null) => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId,
        villageName: selectedVillageName,
        reporterName,
        mobileNumber,
        mobileVerified,
        description,
        photos,
        video,
        audioNote: audioNoteData,
        startLatitude: startLatitude || null,
        startLongitude: startLongitude || null,
        endLatitude: endLatitude || null,
        endLongitude: endLongitude || null,
        distanceKm: distanceKm,
        status: "pending",
      };
      const res = await apiRequest("POST", "/api/road/report", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/road/my-reports", user.id] });
      toast({ title: l("submittedTitle", language) });
      setStep("submitted");
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
      toast({ title: "Microphone access denied", variant: "destructive" });
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

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setVideo(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedVillageId) {
      toast({ title: l("unitRequired", language), variant: "destructive" });
      return;
    }
    if (!reporterName.trim()) {
      toast({ title: l("nameRequired", language), variant: "destructive" });
      return;
    }
    if (!mobileVerified) {
      toast({ title: l("verifyMobile", language), variant: "destructive" });
      setStep("verify_mobile");
      return;
    }
    if (!description.trim()) {
      toast({ title: l("descriptionRequired", language), variant: "destructive" });
      return;
    }
    if (photos.length === 0) {
      toast({ title: l("photosRequired", language), variant: "destructive" });
      return;
    }
    if (!startLatitude || !startLongitude || !endLatitude || !endLongitude) {
      toast({ title: l("mapRequired", language), variant: "destructive" });
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
    setReporterName("");
    setMobileNumber("");
    setMobileVerified(false);
    setOtpSent(false);
    setOtp("");
    setDescription("");
    setPhotos([]);
    setVideo(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setStartLatitude("");
    setStartLongitude("");
    setEndLatitude("");
    setEndLongitude("");
    setDistanceKm(null);
  };

  const handleBack = () => {
    switch (step) {
      case "verify_mobile":
        setStep("select_unit");
        break;
      case "select_unit":
        setStep("description");
        break;
      case "form":
        setStep("verify_mobile");
        break;
      default:
        setLocation("/app");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white no-default-hover-elevate"
          onClick={step === "description" ? () => setLocation("/app") : handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {l("title", language)}
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {step === "description" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <RouteIcon className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">
                      {l("title", language)}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {l("description", language)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => setStep("select_unit")}>
              <Send className="h-4 w-4 mr-2" />
              Start New Road Report
            </Button>

            {myReports && myReports.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {l("previousReports", language)} ({myReports.length})
                  </h3>
                </div>
                {myReports.map((report) => (
                  <ReportCard key={report.id} report={report} language={language} />
                ))}
              </div>
            )}

            {myReports && myReports.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <RouteIcon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">{l("noReports", language)}</p>
              </div>
            )}
          </div>
        )}

        {step === "select_unit" && (
          <div className="space-y-4">
            <div className="px-1">
              <h2 className="text-lg font-semibold text-slate-800">
                {l("unitHeading", language)}
              </h2>
              <p className="text-sm text-slate-500">
                {l("unitSubtitle", language)}
              </p>
            </div>
            <UnitSelector
              title={l("unitHeading", language)}
              subtitle={l("unitSubtitle", language)}
              onSelect={(unit) => {
                setSelectedVillageId(unit.villageId);
                setSelectedVillageName(unit.villageName);
              }}
            />
            <Button
              className="w-full"
              onClick={() => {
                if (!selectedVillageId) {
                  toast({ title: l("unitRequired", language), variant: "destructive" });
                  return;
                }
                setStep("verify_mobile");
              }}
            >
              Continue
            </Button>
          </div>
        )}

        {step === "verify_mobile" && (
          <div className="space-y-4">
            <div className="px-1">
              <h2 className="text-lg font-semibold text-slate-800">
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
                      {l("mobileNumberLabel", language)}
                    </label>
                  </div>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="9876543210"
                  />
                  <Button
                    className="w-full"
                    onClick={() => sendOtpMutation.mutate()}
                    disabled={mobileNumber.length !== 10 || sendOtpMutation.isPending}
                  >
                    {sendOtpMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    {l("sendOtp", language)}
                  </Button>
                </div>

                {otpSent && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs text-green-600">
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
                    />
                    <Button
                      className="w-full"
                      onClick={() => verifyOtpMutation.mutate()}
                      disabled={otp.length !== 4 || verifyOtpMutation.isPending}
                    >
                      {verifyOtpMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      {l("verifyOtp", language)}
                    </Button>
                  </div>
                )}

                {mobileVerified && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {l("otpVerified", language)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {l("reporterName", language)}
                  </label>
                  <Input
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder={l("reporterNamePlaceholder", language)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {l("descriptionLabel", language)}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={l("descriptionPlaceholder", language)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {l("capturePhotos", language)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {l("photosHint", language)}
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 cursor-pointer">
                      <Camera className="h-4 w-4" />
                      Capture / Upload
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotosChange}
                      />
                    </label>
                  </div>
                  {photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pt-1">
                      {photos.map((p, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-md overflow-hidden border">
                          <img
                            src={p}
                            alt={`Road ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    {l("addVideo", language)}
                  </p>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    {video ? "Change Video" : "Upload Video"}
                    <input
                      type="file"
                      accept="video/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleVideoChange}
                    />
                  </label>
                  {video && (
                    <video
                      src={video}
                      controls
                      className="w-full rounded-md border mt-1"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    {l("addAudio", language)}
                  </p>
                  <div className="flex items-center gap-2">
                    {!isRecording && (
                      <Button size="sm" variant="outline" onClick={startRecording}>
                        <Mic className="h-4 w-4 mr-1" />
                        {l("startRecording", language)}
                      </Button>
                    )}
                    {isRecording && (
                      <Button size="sm" variant="destructive" onClick={stopRecording}>
                        <StopCircle className="h-4 w-4 mr-1" />
                        {l("stopRecording", language)}
                      </Button>
                    )}
                    {audioUrl && (
                      <>
                        <Button size="icon" variant="outline" onClick={playAudio}>
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={deleteAudio}>
                          ✕
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    {l("mapHeading", language)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {l("mapSubheading", language)}
                  </p>
                  <RoadMapPicker
                    startLatitude={startLatitude}
                    startLongitude={startLongitude}
                    endLatitude={endLatitude}
                    endLongitude={endLongitude}
                    language={language}
                    onChange={(data) => {
                      setStartLatitude(data.startLatitude);
                      setStartLongitude(data.startLongitude);
                      setEndLatitude(data.endLatitude);
                      setEndLongitude(data.endLongitude);
                      setDistanceKm(data.distanceKm);
                    }}
                  />
                </div>

                <Button
                  className="w-full mt-2"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {l("submit", language)}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "submitted" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 text-center space-y-2">
                <h2 className="text-base font-semibold text-slate-800">
                  {l("submittedTitle", language)}
                </h2>
                <p className="text-sm text-slate-500">
                  {l("submittedDesc", language)}
                </p>
              </CardContent>
            </Card>
            <Button
              className="w-full"
              onClick={() => {
                resetForm();
                setStep("description");
              }}
            >
              {l("submitAnother", language)}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setLocation("/app")}
            >
              {l("goHome", language)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

