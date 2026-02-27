import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Camera, Upload, Mic, MicOff, Play, Square, Trash2, MapPin, ChevronRight, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "form";

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Nasha Viruddh Yuddh", hi: "नशा विरुद्ध युद्ध", pa: "ਨਸ਼ਾ ਵਿਰੁੱਧ ਯੁੱਧ" },
  intro: {
    en: "Report locations where drug-related activity is happening so that action can be taken. Your report will go directly to admins and will not be shown in your history.",
    hi: "जहां नशे से जुड़ी गतिविधि हो रही है, उन स्थानों की रिपोर्ट करें ताकि कार्रवाई की जा सके। आपकी रिपोर्ट सीधे एडमिन के पास जाएगी और आपकी हिस्ट्री में नहीं दिखेगी।",
    pa: "ਜਿੱਥੇ ਨਸ਼ੇ ਨਾਲ ਜੁੜੀ ਗਤੀਵਿਧੀ ਚੱਲ ਰਹੀ ਹੈ, ਉਹ ਥਾਵਾਂ ਰਿਪੋਰਟ ਕਰੋ ਤਾਂ ਜੋ ਕਾਰਵਾਈ ਕੀਤੀ ਜਾ ਸਕੇ। ਤੁਹਾਡੀ ਰਿਪੋਰਟ ਸਿੱਧੀ ਐਡਮਿਨ ਕੋਲ ਜਾਵੇਗੀ ਅਤੇ ਤੁਹਾਡੇ ਲਾਗ ਵਿੱਚ ਨਹੀਂ ਦਿਖੇਗੀ।",
  },
  start: {
    en: "Start New Report",
    hi: "नई रिपोर्ट शुरू करें",
    pa: "ਨਵੀਂ ਰਿਪੋਰਟ ਸ਼ੁਰੂ ਕਰੋ",
  },
  selectUnit: {
    en: "Select Unit (Village/Ward)",
    hi: "इकाई चुनें (गांव/वार्ड)",
    pa: "ਯੂਨਿਟ ਚੁਣੋ (ਪਿੰਡ/ਵਾਰਡ)",
  },
  selectUnitSubtitle: {
    en: "Select the exact village/ward where drug-related activity is happening. Do NOT select your home unit if the activity is elsewhere.",
    hi: "वह सटीक गांव/वार्ड चुनें जहां नशे से जुड़ी गतिविधि हो रही है। अगर गतिविधि कहीं और हो रही है तो अपना घर वाला यूनिट न चुनें।",
    pa: "ਉਹ ਸਹੀ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ ਜਿੱਥੇ ਨਸ਼ੇ ਨਾਲ ਜੁੜੀ ਗਤੀਵਿਧੀ ਚੱਲ ਰਹੀ ਹੈ। ਜੇ ਗਤੀਵਿਧੀ ਕਿਤੇ ਹੋਰ ਹੈ ਤਾਂ ਆਪਣੀ ਰਹਿਣ ਵਾਲੀ ਯੂਨਿਟ ਨਾ ਚੁਣੋ।",
  },
  photoLabel: {
    en: "Photo (Capture or Upload)",
    hi: "फोटो (कैप्चर या अपलोड)",
    pa: "ਫੋਟੋ (ਕੈਪਚਰ ਜਾਂ ਅੱਪਲੋਡ)",
  },
  description: {
    en: "Description",
    hi: "विवरण",
    pa: "ਵੇਰਵਾ",
  },
  descriptionPlaceholder: {
    en: "Describe what kind of drug-related activity is happening, approximate time, and any other important details...",
    hi: "किस प्रकार की नशे से जुड़ी गतिविधि हो रही है, लगभग समय और अन्य महत्वपूर्ण जानकारी लिखें...",
    pa: "ਕਿਹੜੀ ਕਿਸਮ ਦੀ ਨਸ਼ੇ ਨਾਲ ਜੁੜੀ ਗਤੀਵਿਧੀ ਚੱਲ ਰਹੀ ਹੈ, ਲਗਭਗ ਸਮਾਂ ਅਤੇ ਹੋਰ ਜਰੂਰੀ ਵੇਰਵੇ ਲਿਖੋ...",
  },
  audioNote: {
    en: "Voice Note (Optional)",
    hi: "वॉइस नोट (वैकल्पिक)",
    pa: "ਵੌਇਸ ਨੋਟ (ਵਿਕਲਪਿਕ)",
  },
  record: { en: "Record", hi: "रिकॉर्ड", pa: "ਰਿਕਾਰਡ" },
  recording: { en: "Recording...", hi: "रिकॉर्ड हो रहा है...", pa: "ਰਿਕਾਰਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  recorded: { en: "Voice note recorded", hi: "वॉइस नोट रिकॉर्ड", pa: "ਵੌਇਸ ਨੋਟ ਰਿਕਾਰਡ" },
  stop: { en: "Stop", hi: "रोकें", pa: "ਰੋਕੋ" },
  play: { en: "Play", hi: "सुनें", pa: "ਸੁਣੋ" },
  delete: { en: "Delete", hi: "हटाएं", pa: "ਹਟਾਓ" },
  locationTitle: {
    en: "Location (Very Important)",
    hi: "स्थान (बहुत महत्वपूर्ण)",
    pa: "ਸਥਾਨ (ਬਹੁਤ ਮਹੱਤਵਪੂਰਣ)",
  },
  locationHelper: {
    en: "Stand near the spot and tap “Use Current Location”, or type the address/landmark clearly.",
    hi: "स्थान के पास खड़े होकर \"वर्तमान स्थान उपयोग करें\" दबाएं, या पता/नज़दीकी निशान साफ‑साफ लिखें।",
    pa: "ਜਗ੍ਹਾ ਦੇ ਨੇੜੇ ਖੜ੍ਹ ਕੇ \"ਮੌਜੂਦਾ ਸਥਾਨ ਵਰਤੋ\" ਦਬਾਓ ਜਾਂ ਪਤਾ/ਨਜ਼ਦੀਕੀ ਨਿਸ਼ਾਨ ਸਾਫ਼-ਸਾਫ਼ ਲਿਖੋ।",
  },
  useCurrentLocation: {
    en: "Use Current Location",
    hi: "वर्तमान स्थान उपयोग करें",
    pa: "ਮੌਜੂਦਾ ਸਥਾਨ ਵਰਤੋ",
  },
  locationAddress: {
    en: "Address / Landmark",
    hi: "पता / नज़दीकी निशान",
    pa: "ਪਤਾ / ਨੇੜਲਾ ਨਿਸ਼ਾਨ",
  },
  submit: {
    en: "Submit Report to Admin",
    hi: "रिपोर्ट एडमिन को भेजें",
    pa: "ਰਿਪੋਰਟ ਐਡਮਿਨ ਨੂੰ ਭੇਜੋ",
  },
  submitting: {
    en: "Submitting...",
    hi: "भेजा जा रहा है...",
    pa: "ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ...",
  },
  submitted: {
    en: "Report submitted to admin",
    hi: "रिपोर्ट एडमिन को भेज दी गई है",
    pa: "ਰਿਪੋਰਟ ਐਡਮਿਨ ਨੂੰ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ",
  },
  requiredPhoto: {
    en: "Please add at least one photo",
    hi: "कृपया कम से कम एक फोटो जोड़ें",
    pa: "ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਫੋਟੋ ਪਾਓ",
  },
  requiredDescription: {
    en: "Description is required",
    hi: "विवरण आवश्यक है",
    pa: "ਵੇਰਵਾ ਲਾਜ਼ਮੀ ਹੈ",
  },
  requiredLocation: {
    en: "Location is required (latitude/longitude or address)",
    hi: "स्थान आवश्यक है (लोकेशन या पता)",
    pa: "ਸਥਾਨ ਲਾਜ਼ਮੀ ਹੈ (ਲੋਕੇਸ਼ਨ ਜਾਂ ਪਤਾ)",
  },
  errorSubmit: {
    en: "Failed to submit report",
    hi: "रिपोर्ट भेजने में समस्या आई",
    pa: "ਰਿਪੋਰਟ ਭੇਜਣ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ",
  },
};

function l(key: string, lang: string): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as any)[lang] || entry.en;
}

export default function TaskNvy({ user }: Props) {
  const { language } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const submitMutation = useMutation({
    mutationFn: async (audioNoteData: string | null) => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId,
        villageName: selectedVillageName,
        photo,
        audioNote: audioNoteData,
        description,
        latitude: latitude || null,
        longitude: longitude || null,
        locationAddress: locationAddress || null,
      };
      const res = await apiRequest("POST", "/api/nvy/report", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: l("submitted", language) });
      resetForm();
      setStep("description");
    },
    onError: () => {
      toast({ title: l("errorSubmit", language), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedVillageId("");
    setSelectedVillageName("");
    setPhoto(null);
    setDescription("");
    setLatitude("");
    setLongitude("");
    setLocationAddress("");
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location not supported", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
      },
      () => {
        toast({ title: "Failed to fetch location", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    if (!selectedVillageId) {
      toast({ title: l("selectUnit", language), variant: "destructive" });
      return;
    }
    if (!photo) {
      toast({ title: l("requiredPhoto", language), variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: l("requiredDescription", language), variant: "destructive" });
      return;
    }
    if (!((latitude && longitude) || locationAddress.trim())) {
      toast({ title: l("requiredLocation", language), variant: "destructive" });
      return;
    }
    let audioNoteData: string | null = null;
    if (audioBlob) {
      audioNoteData = await blobToBase64(audioBlob);
    }
    submitMutation.mutate(audioNoteData);
  };

  if (step === "select_unit") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-red-700 text-white px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white no-default-hover-elevate"
            onClick={() => setStep("description")}
            data-testid="button-nvy-unit-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            <h1 className="font-semibold text-lg">{l("title", language)}</h1>
          </div>
        </header>

        <div className="p-4">
          <UnitSelector
            title={l("selectUnit", language)}
            subtitle={l("selectUnitSubtitle", language)}
            defaultVillageId={user.mappedAreaId || undefined}
            onSelect={(unit) => {
              setSelectedVillageId(unit.villageId);
              setSelectedVillageName(unit.villageName);
              setStep("form");
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "description") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-red-700 text-white px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white no-default-hover-elevate"
            onClick={() => setLocation("/app")}
            data-testid="button-nvy-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            <h1 className="font-semibold text-lg">{l("title", language)}</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-slate-700">{l("intro", language)}</p>
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5" />
                <span>
                  {l("selectUnitSubtitle", language)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full bg-red-700"
            onClick={() => setStep("select_unit")}
            data-testid="button-nvy-start"
          >
            {l("start", language)} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-red-700 text-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white no-default-hover-elevate"
          onClick={() => setStep("select_unit")}
          data-testid="button-nvy-form-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <h1 className="font-semibold text-lg">{l("title", language)}</h1>
        </div>
      </header>

      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center gap-2 px-1 flex-wrap">
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1" data-testid="badge-nvy-unit">
            <MapPin className="h-3 w-3" /> {selectedVillageName}
          </Badge>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">{l("photoLabel", language)}</h3>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-nvy-camera"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-nvy-upload"
            />
            {!photo && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  data-testid="button-nvy-camera"
                >
                  <Camera className="h-4 w-4 mr-1" /> Capture
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-nvy-upload"
                >
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
              </div>
            )}
            {photo && (
              <div className="relative inline-block">
                <img
                  src={photo}
                  alt="Report"
                  className="max-h-48 rounded-lg border border-slate-200"
                  data-testid="img-nvy-photo"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white text-red-600"
                  onClick={() => setPhoto(null)}
                  data-testid="button-nvy-remove-photo"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{l("description", language)} *</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={l("descriptionPlaceholder", language)}
                rows={4}
                data-testid="textarea-nvy-description"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{l("audioNote", language)}</label>
              <div className="flex items-center gap-2 flex-wrap">
                {!isRecording && !audioBlob && (
                  <Button variant="outline" size="sm" onClick={startRecording} data-testid="button-nvy-start-recording">
                    <Mic className="h-4 w-4 mr-1" /> {l("record", language)}
                  </Button>
                )}
                {isRecording && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopRecording}
                    className="text-red-600"
                    data-testid="button-nvy-stop-recording"
                  >
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
                    <Button variant="outline" size="sm" onClick={playAudio} data-testid="button-nvy-play-audio">
                      <Play className="h-4 w-4 mr-1" /> {l("play", language)}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deleteAudio}
                      className="text-red-600"
                      data-testid="button-nvy-delete-audio"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> {l("delete", language)}
                    </Button>
                    <span className="text-xs text-green-600">{l("recorded", language)}</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              {l("locationTitle", language)}
            </h3>
            <p className="text-xs text-slate-600">{l("locationHelper", language)}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseCurrentLocation}
                data-testid="button-nvy-use-location"
              >
                <MapPin className="h-4 w-4 mr-1" /> {l("useCurrentLocation", language)}
              </Button>
              {(latitude || longitude) && (
                <span className="text-xs text-green-700">
                  {latitude},{longitude}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{l("locationAddress", language)}</label>
              <Textarea
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                rows={2}
                data-testid="textarea-nvy-location-address"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full bg-red-700"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          data-testid="button-nvy-submit"
        >
          {submitMutation.isPending ? l("submitting", language) : l("submit", language)}
        </Button>
      </div>
    </div>
  );
}

