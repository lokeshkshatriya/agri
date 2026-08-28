"use client";

import React, { useState, useEffect, useRef } from "react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  intent?: string;
  confidence?: number;
  actionName?: string;
  audioB64?: string;
  weatherData?: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    wind_gusts: number;
    rain_prob_6h: number;
    spray_status: string;
    spray_badge: string;
    spray_advice: string;
    safe_window: string;
  };
  irrigationData?: {
    crop_type: string;
    growth_stage: string;
    recommendation: string;
    reason: string;
    next_check_date: string;
    rainfall_expected_mm: number;
    confidence: string;
  };
  diagnosisData?: {
    cropName: string;
    diseaseName: string;
    pathogen: string;
    confidenceScore: number;
    affectedAreaPct: number;
    chlorophyllVigorPct: number;
    severity: string;
    organicCure: string;
    chemicalCure: string;
    reasoning?: {
      urgency_level: string;
      urgency_color: string;
      urgency_label: string;
      is_escalated: boolean;
      escalation_reason?: string;
      kisan_helpline: string;
      tier_1_organic: {
        name: string;
        dosage: string;
        cost_inr: string;
        result_days: string;
        patience_note: string;
      };
      tier_2_moderate: {
        name: string;
        dosage: string;
        cost_inr: string;
      };
      tier_3_systemic: {
        name: string;
        dosage: string;
        cost_inr: string;
      };
    };
  };
  timestamp: string;
}

interface SavedCrop {
  id: string;
  crop_type: string;
  added_date: string;
  current_stage?: string;
  last_alert?: {
    stage: string;
    risks: Array<{
      risk_name: string;
      what_to_look_for: string;
      action: string;
    }>;
    updated_at: string;
  };
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "crops">("chat");
  const [lang, setLang] = useState<"te" | "en">("te");
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 17.3850, lon: 78.4867 });
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [irrigationModalOpen, setIrrigationModalOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("tomato");
  const [selectedStage, setSelectedStage] = useState("flowering");
  const [autoSpeak, setAutoSpeak] = useState(true);

  // My Crops State (localStorage backed)
  const [savedCrops, setSavedCrops] = useState<SavedCrop[]>([]);
  const [addCropModalOpen, setAddCropModalOpen] = useState(false);
  const [stageModalTargetCrop, setStageModalTargetCrop] = useState<SavedCrop | null>(null);
  const [stageLoadingId, setStageLoadingId] = useState<string | null>(null);

  // First-time Onboarding Fullscreen State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSelectedCrops, setOnboardingSelectedCrops] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const [liveWeather, setLiveWeather] = useState<{
    temperature: number;
    humidity: number;
    wind_speed: number;
    rain_prob_6h: number;
    spray_status: string;
    spray_badge: string;
    safe_window: string;
  } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Load saved crops and check onboarding on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const hasOnboarded = localStorage.getItem("agrisahayak_onboarded");
        if (!hasOnboarded) {
          setShowOnboarding(true);
        }

        const stored = localStorage.getItem("agrisahayak_my_crops");
        if (stored) {
          setSavedCrops(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load saved crops from localStorage:", e);
      }
    }
  }, []);

  const handleSkipOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("agrisahayak_onboarded", "true");
    }
  };

  const handleCompleteOnboarding = () => {
    if (onboardingSelectedCrops.length > 0) {
      const newCrops: SavedCrop[] = onboardingSelectedCrops.map((cType) => ({
        id: `${Date.now()}_${cType}`,
        crop_type: cType,
        added_date: new Date().toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }),
      }));
      saveCropsToStorage(newCrops);
    }
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("agrisahayak_onboarded", "true");
    }
  };

  const toggleOnboardingCrop = (cropId: string) => {
    setOnboardingSelectedCrops((prev) =>
      prev.includes(cropId) ? prev.filter((id) => id !== cropId) : [...prev, cropId]
    );
  };

  const saveCropsToStorage = (updatedList: SavedCrop[]) => {
    setSavedCrops(updatedList);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("agrisahayak_my_crops", JSON.stringify(updatedList));
      } catch (e) {
        console.error("Failed to save crops to localStorage:", e);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        (err) => {
          console.log("Using regional fallback coordinates:", err.message);
        },
        { timeout: 8000 }
      );
    }
  }, []);

  // Fetch persistent weather widget data
  useEffect(() => {
    if (!mounted) return;
    const fetchLiveWeather = async () => {
      try {
        setWeatherLoading(true);
        const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
        const res = await fetch(
          `http://${host}:8000/api/weather/advisory?lat=${coords.lat}&lon=${coords.lon}&lang=${lang}`
        );
        if (res.ok) {
          const data = await res.json();
          setLiveWeather({
            temperature: data.temperature,
            humidity: data.humidity,
            wind_speed: data.wind_speed,
            rain_prob_6h: data.rain_prob_6h,
            spray_status: data.spray_status,
            spray_badge: data.spray_badge,
            safe_window: data.safe_window,
          });
        }
      } catch (e) {
        console.error("Live weather fetch failed:", e);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchLiveWeather();
  }, [mounted, coords.lat, coords.lon, lang]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = lang === "te" ? "te-IN" : "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsListening(false);
          if (transcript) {
            handleSendMessage(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [lang]);

  // Handle Camera Viewfinder
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cameraActive && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          alert("Could not access device camera");
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraActive]);

  const toggleListening = () => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      alert(
        lang === "te"
          ? "మీ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ సపోర్ట్ లేదు. దయచేసి Google Chrome వాడండి."
          : "Voice recognition is not supported in this browser. Please open in Google Chrome."
      );
      return;
    }

    try {
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = lang === "te" ? "te-IN" : "en-US";

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsListening(false);
          if (transcript) handleSendMessage(transcript);
        };
        recognition.onerror = (e: any) => {
          console.warn("Speech error:", e);
          setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch (err) {
      console.error("Speech start error:", err);
      setIsListening(false);
    }
  };

  const handleSendMessage = async (queryText: string) => {
    const cleanText = queryText.trim();
    if (!cleanText) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [userMsg, ...prev]);
    setInputText("");
    setLoading(true);

    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`http://${host}:8000/api/voice/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanText, lang, lat: coords.lat, lon: coords.lon }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (data.intent === "OPEN_CAMERA") {
        setCameraActive(true);
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: data.reply_text,
        intent: data.intent,
        confidence: data.confidence_pct,
        actionName: data.action_name,
        audioB64: data.audio_b64,
        weatherData: data.weather_data,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [botMsg, ...prev]);

      if (autoSpeak && data.audio_b64 && audioPlayerRef.current) {
        audioPlayerRef.current.src = data.audio_b64;
        audioPlayerRef.current.play().catch((e) => console.log("Audio play prevented:", e));
      }
    } catch (error) {
      console.error("API error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text:
          lang === "te"
            ? "సర్వర్ తో కనెక్ట్ కాలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి."
            : "Could not connect to backend server. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [errorMsg, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const handleIrrigationSubmit = async () => {
    setIrrigationModalOpen(false);
    setLoading(true);

    const cropLabels: Record<string, { en: string; te: string }> = {
      rice: { en: "Rice (Paddy)", te: "వరి (Rice)" },
      wheat: { en: "Wheat", te: "గోధుమ (Wheat)" },
      cotton: { en: "Cotton", te: "పత్తి (Cotton)" },
      groundnut: { en: "Groundnut", te: "వేరుశనగ (Groundnut)" },
      maize: { en: "Maize (Corn)", te: "మొక్కజొన్న (Maize)" },
      sugarcane: { en: "Sugarcane", te: "చెరకు (Sugarcane)" },
      chilli: { en: "Chilli", te: "మిరప (Chilli)" },
      tomato: { en: "Tomato", te: "టమాటా (Tomato)" },
    };

    const stageLabels: Record<string, { en: string; te: string }> = {
      sowing: { en: "Sowing", te: "విత్తే దశ" },
      vegetative: { en: "Vegetative", te: "శాకీయ ఎదుగుదల" },
      flowering: { en: "Flowering", te: "పూత దశ" },
      harvest: { en: "Harvest", te: "కోత దశ" },
    };

    const userPromptText =
      lang === "te"
        ? `💧 ${cropLabels[selectedCrop]?.te || selectedCrop} (${stageLabels[selectedStage]?.te || selectedStage}) - నీటిపారుదల సలహా`
        : `💧 ${cropLabels[selectedCrop]?.en || selectedCrop} (${stageLabels[selectedStage]?.en || selectedStage}) - Irrigation Advice`;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userPromptText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [userMsg, ...prev]);

    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`http://${host}:8000/api/irrigation/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords.lat,
          lon: coords.lon,
          crop_type: selectedCrop,
          growth_stage: selectedStage,
          lang,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: data.reason,
        intent: "IRRIGATION_ADVICE",
        confidence: 95,
        actionName: `${data.crop_type} (${data.growth_stage})`,
        audioB64: data.audio_b64,
        irrigationData: {
          crop_type: data.crop_type,
          growth_stage: data.growth_stage,
          recommendation: data.recommendation,
          reason: data.reason,
          next_check_date: data.next_check_date,
          rainfall_expected_mm: data.rainfall_expected_mm,
          confidence: data.confidence,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [botMsg, ...prev]);

      if (autoSpeak && data.audio_b64 && audioPlayerRef.current) {
        audioPlayerRef.current.src = data.audio_b64;
        audioPlayerRef.current.play().catch((e) => console.log("Audio prevented:", e));
      }
    } catch (err) {
      console.error("Irrigation request error:", err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text:
          lang === "te"
            ? "నీటిపారుదల సలహా పొందడంలో సమస్య ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి."
            : "Could not retrieve irrigation advisory. Please check your network and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [errMsg, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  // Add a crop (1-tap selection)
  const handleAddCrop = (cropType: string) => {
    const newCrop: SavedCrop = {
      id: Date.now().toString(),
      crop_type: cropType,
      added_date: new Date().toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }),
    };
    const updated = [newCrop, ...savedCrops];
    saveCropsToStorage(updated);
    setAddCropModalOpen(false);
  };

  // Delete a crop from list
  const handleDeleteCrop = (cropId: string) => {
    const updated = savedCrops.filter((c) => c.id !== cropId);
    saveCropsToStorage(updated);
  };

  // Fetch stage-specific alerts and persist inside the crop card
  const handleFetchStagePrecautions = async (crop: SavedCrop, stageLabel: string) => {
    setStageModalTargetCrop(null);
    setStageLoadingId(crop.id);

    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const res = await fetch(`http://${host}:8000/api/crops/precautions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop_type: crop.crop_type,
          stage: stageLabel,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedList = savedCrops.map((c) => {
          if (c.id === crop.id) {
            return {
              ...c,
              current_stage: stageLabel,
              last_alert: {
                stage: stageLabel,
                risks: data.risks || [],
                updated_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            };
          }
          return c;
        });

        saveCropsToStorage(updatedList);

        // Auto-play audio
        if (autoSpeak && data.audio_b64 && audioPlayerRef.current) {
          audioPlayerRef.current.src = data.audio_b64;
          audioPlayerRef.current.play().catch((e) => console.log("Audio prevented:", e));
        }
      }
    } catch (err) {
      console.error("Failed to load stage precautions:", err);
    } finally {
      setStageLoadingId(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageDiagnosis = async (imageBlob: Blob | File) => {
    setLoading(true);
    setCameraActive(false);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: lang === "te" ? "📷 ఆకు చిత్రం స్కాన్ చేయబడుతోంది..." : "📷 Scanning crop leaf image...",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [userMsg, ...prev]);

    const formData = new FormData();
    formData.append("file", imageBlob, "leaf_capture.jpg");
    formData.append("lang", lang);

    // Pass saved crops filter if farmer has selected specific crops
    if (savedCrops && savedCrops.length > 0) {
      const cropTypes = savedCrops.map((c) => c.crop_type).join(",");
      formData.append("crop_filter", cropTypes);
    }

    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(`http://${host}:8000/api/crop/diagnose`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: data.symptoms,
        intent: "SCAN_DISEASE",
        confidence: data.confidence_score,
        actionName: `${data.crop_name}: ${data.disease_name}`,
        audioB64: data.audio_b64,
        diagnosisData: {
          cropName: data.crop_name,
          diseaseName: data.disease_name,
          pathogen: data.pathogen,
          confidenceScore: data.confidence_score,
          affectedAreaPct: data.affected_area_pct,
          chlorophyllVigorPct: data.chlorophyll_vigor_pct,
          severity: data.severity,
          organicCure: data.organic_cure,
          chemicalCure: data.chemical_cure,
          reasoning: data.reasoning,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [botMsg, ...prev]);

      if (autoSpeak && data.audio_b64 && audioPlayerRef.current) {
        audioPlayerRef.current.src = data.audio_b64;
        audioPlayerRef.current.play().catch((e) => console.log("Audio prevented:", e));
      }
    } catch (err) {
      console.error("Diagnosis upload error:", err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: lang === "te" ? "చిత్రం విశ్లేషించడంలో సమస్య ఏర్పడింది." : "Failed to analyze image. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [errMsg, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          handleImageDiagnosis(blob);
        }
      }, "image/jpeg", 0.9);
    }
  };

  const quickPrompts =
    lang === "te"
      ? [
          { text: "📷 కెమెరా ఆన్ చేసి స్కాన్ చేయి", label: "కెమెరా స్కాన్" },
          { text: "🌦️ రేపు మందు పిచికారీ చేయవచ్చా?", label: "వాతావరణం" },
          { text: "💧 ఎండగా ఉంది నీళ్లు పెట్టాలా?", label: "నీటిపారుదల" },
          { text: "🌱 ఎరువు ఎంత బస్తాలు వేయాలి?", label: "ఎరువులు" },
          { text: "⚠️ పురుగుల ముప్పు ఉందా?", label: "తెగుళ్ల అలర్ట్" },
        ]
      : [
          { text: "📷 Open camera to scan leaf", label: "Scan Leaf (Camera)" },
          { text: "🌦️ Can I spray pesticide tomorrow?", label: "Weather Spray" },
          { text: "💧 It is very dry, should I irrigate?", label: "Irrigation" },
          { text: "🌱 How many bags of fertilizer needed?", label: "Fertilizer" },
          { text: "⚠️ Any pest outbreak risk?", label: "Pest Warning" },
        ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showOnboarding) {
    const onboardingCropsList = [
      { id: "tomato", icon: "🍅", name_en: "Tomato", name_te: "టమాటా (Tomato)" },
      { id: "rice", icon: "🌾", name_en: "Rice (Paddy)", name_te: "వరి (Rice)" },
      { id: "chilli", icon: "🌶️", name_en: "Chilli (Mirchi)", name_te: "మిరప (Chilli)" },
      { id: "cotton", icon: "🌿", name_en: "Cotton", name_te: "పత్తి (Cotton)" },
      { id: "groundnut", icon: "🥜", name_en: "Groundnut", name_te: "వేరుశనగ (Groundnut)" },
      { id: "maize", icon: "🌽", name_en: "Maize (Corn)", name_te: "మొక్కజొన్న (Maize)" },
      { id: "sugarcane", icon: "🎋", name_en: "Sugarcane", name_te: "చెరకు (Sugarcane)" },
      { id: "wheat", icon: "🌾", name_en: "Wheat", name_te: "గోధుమ (Wheat)" },
    ];

    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-green-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-lg bg-white/95 text-zinc-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-emerald-300/60 backdrop-blur-md space-y-5">
          {/* Header & Language Switcher */}
          <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🌾</span>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg text-emerald-950">
                  {lang === "te" ? "స్వాగతం! మీ పంటలను ఎంచుకోండి" : "Welcome! Select Your Crops"}
                </h1>
                <p className="text-[11px] text-zinc-500">
                  {lang === "te"
                    ? "మీ పొలంలో సాగుచేస్తున్న పంటలను ఎంచుకోండి"
                    : "Pick the crops you grow for customized advisories"}
                </p>
              </div>
            </div>

            {/* Language Toggle */}
            <div className="flex bg-emerald-100/70 rounded-full p-0.5 border border-emerald-300 text-xs font-bold">
              <button
                onClick={() => setLang("te")}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  lang === "te" ? "bg-emerald-800 text-white shadow-xs" : "text-emerald-900"
                }`}
              >
                తెలుగు
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  lang === "en" ? "bg-emerald-800 text-white shadow-xs" : "text-emerald-900"
                }`}
              >
                English
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            {lang === "te"
              ? "మీరు సాగుచేస్తున్న పంటలపై ట్యాప్ చేయండి (ఒకటి లేదా అంతకంటే ఎక్కువ). తగిన వ్యాధి హెచ్చరికలు & పిచికారీ సలహాలు అందుతాయి:"
              : "Tap on the crops you are currently growing (select one or more). You can change this anytime:"}
          </p>

          {/* 8-Crop Visual Selection Grid */}
          <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {onboardingCropsList.map((crop) => {
              const isSelected = onboardingSelectedCrops.includes(crop.id);
              return (
                <button
                  key={crop.id}
                  onClick={() => toggleOnboardingCrop(crop.id)}
                  className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex items-center space-x-2.5 shadow-xs ${
                    isSelected
                      ? "bg-emerald-700 border-emerald-600 text-white shadow-md ring-2 ring-emerald-500/50"
                      : "bg-emerald-50/60 hover:bg-emerald-100/80 border-emerald-200 text-zinc-800"
                  }`}
                >
                  <span className="text-2xl">{crop.icon}</span>
                  <div className="flex-1">
                    <span className={`text-xs font-bold block ${isSelected ? "text-white" : "text-emerald-950"}`}>
                      {lang === "te" ? crop.name_te : crop.name_en}
                    </span>
                    <span className={`text-[10px] ${isSelected ? "text-emerald-200" : "text-zinc-500"}`}>
                      {isSelected
                        ? lang === "te" ? "✓ ఎంపిక చేయబడింది" : "✓ Selected"
                        : lang === "te" ? "+ ఎంచుకోండి" : "+ Tap to select"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Buttons: Skip vs Continue */}
          <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
            <button
              onClick={handleSkipOnboarding}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-800 px-4 py-2.5 rounded-full hover:bg-zinc-100 transition-all"
            >
              {lang === "te" ? "దాటవేయి (Skip)" : "Skip for now"}
            </button>

            <button
              onClick={handleCompleteOnboarding}
              disabled={onboardingSelectedCrops.length === 0}
              className={`font-bold text-xs px-5 py-2.5 rounded-full shadow-lg transition-all flex items-center space-x-1.5 ${
                onboardingSelectedCrops.length > 0
                  ? "bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              }`}
            >
              <span>{lang === "te" ? "ప్రారంభించండి" : "Save & Continue"}</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 flex flex-col items-center p-3 sm:p-6 pb-36">
      {/* Hidden Audio Player */}
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Header Container */}
      <div className="w-full max-w-lg bg-gradient-to-r from-emerald-800 to-green-700 text-white rounded-3xl p-5 shadow-xl flex flex-col items-center text-center relative mb-4">
        {/* Language Switcher Bar */}
        <div className="flex items-center justify-between w-full mb-3">
          <div className="flex bg-emerald-950/40 rounded-full p-1 border border-emerald-600/50 text-xs font-semibold">
            <button
              onClick={() => setLang("te")}
              className={`px-3 py-1.5 rounded-full transition-all ${
                lang === "te"
                  ? "bg-white text-emerald-900 shadow-md font-bold"
                  : "text-emerald-100 hover:text-white"
              }`}
            >
              తెలుగు (Telugu)
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1.5 rounded-full transition-all ${
                lang === "en"
                  ? "bg-white text-emerald-900 shadow-md font-bold"
                  : "text-emerald-100 hover:text-white"
              }`}
            >
              English
            </button>
          </div>

          <label className="flex items-center text-xs space-x-1 cursor-pointer bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-600/40">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="accent-green-400 rounded cursor-pointer"
            />
            <span>🔊 Voice</span>
          </label>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          🌾 {lang === "te" ? "అగ్రి సహాయక్" : "AgriSahayak"}
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100 mt-1">
          {lang === "te"
            ? "రైతుల కోసం వాయిస్-ఆధారిత స్మార్ట్ వ్యవసాయ సలహాదారు"
            : "Voice-Commanded Smart Crop Advisory & Disease System"}
        </p>

        {/* Tab Switcher: Chat Copilot vs My Crops */}
        <div className="flex bg-emerald-950/40 rounded-full p-1 border border-emerald-600/50 mt-3.5 text-xs font-bold w-full max-w-xs">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-1.5 rounded-full transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "chat"
                ? "bg-white text-emerald-900 shadow-md"
                : "text-emerald-100 hover:text-white"
            }`}
          >
            <span>💬</span>
            <span>{lang === "te" ? "AI చాట్" : "AI Copilot"}</span>
          </button>
          <button
            onClick={() => setActiveTab("crops")}
            className={`flex-1 py-1.5 rounded-full transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "crops"
                ? "bg-white text-emerald-900 shadow-md"
                : "text-emerald-100 hover:text-white"
            }`}
          >
            <span>🌾</span>
            <span>{lang === "te" ? "నా పంటలు" : "My Crops"}</span>
            {savedCrops.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {savedCrops.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Persistent Hyperlocal Weather Forecast Card */}
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-md border border-emerald-200 mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-sm">📍</span>
            <span className="text-xs font-bold text-emerald-950">
              {lang === "te" ? "ప్రత్యక్ష వాతావరణం & పిచికారీ సలహా" : "Live Weather & Spray Window"}
            </span>
          </div>
          {liveWeather && (
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                liveWeather.spray_status === "UNSAFE"
                  ? "bg-red-100 text-red-800"
                  : liveWeather.spray_status === "CAUTION"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {liveWeather.spray_status === "UNSAFE"
                ? lang === "te" ? "పిచికారీ వద్దు" : "Do Not Spray"
                : liveWeather.spray_status === "CAUTION"
                ? lang === "te" ? "జాగ్రత్త" : "Caution"
                : lang === "te" ? "పిచికారీ చేయవచ్చు" : "Safe to Spray"}
            </span>
          )}
        </div>

        {weatherLoading && !liveWeather ? (
          <div className="flex items-center space-x-2 py-2 text-xs text-zinc-500 animate-pulse">
            <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
            <span>{lang === "te" ? "వాతావరణం లోడ్ అవుతోంది..." : "Loading live weather forecast..."}</span>
          </div>
        ) : liveWeather ? (
          <div className="space-y-2">
            {/* Weather Metrics Grid */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-zinc-500 block">🌡️ {lang === "te" ? "ఉష్ణోగ్రత" : "Temp"}</span>
                <span className="text-xs font-extrabold text-emerald-950">{liveWeather.temperature}°C</span>
              </div>
              <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-zinc-500 block">💧 {lang === "te" ? "తేమ" : "Humidity"}</span>
                <span className="text-xs font-extrabold text-emerald-950">{liveWeather.humidity}%</span>
              </div>
              <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-zinc-500 block">💨 {lang === "te" ? "గాలి" : "Wind"}</span>
                <span className="text-xs font-extrabold text-emerald-950">{liveWeather.wind_speed} <span className="text-[8px]">km/h</span></span>
              </div>
              <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-zinc-500 block">🌧️ {lang === "te" ? "వర్షం" : "Rain"}</span>
                <span className="text-xs font-extrabold text-emerald-950">{liveWeather.rain_prob_6h}%</span>
              </div>
            </div>

            {/* Spray Window Banner */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-l-3 border-emerald-600 px-2.5 py-1.5 rounded-r-xl flex items-center justify-between text-[11px]">
              <span className="text-zinc-600 truncate mr-2">
                ⏰ <b>{lang === "te" ? "సమయం:" : "Window:"}</b> {liveWeather.safe_window}
              </span>
              <button
                onClick={() =>
                  handleSendMessage(
                    lang === "te" ? "🌦️ రేపు మందు పిచికారీ చేయవచ్చా?" : "🌦️ Can I spray pesticide tomorrow?"
                  )
                }
                className="text-emerald-700 hover:text-emerald-900 font-bold whitespace-nowrap text-[10px]"
              >
                {lang === "te" ? "వివరాలు ➔" : "Details ➔"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Camera Viewfinder Modal */}
      {cameraActive && (
        <div className="w-full max-w-lg bg-black rounded-2xl overflow-hidden shadow-2xl mb-4 border-2 border-emerald-500 relative">
          <div className="p-3 bg-emerald-800 text-white flex justify-between items-center text-sm font-semibold">
            <span>📷 {lang === "te" ? "లైవ్ కెమెరా వీక్షణ" : "Live Camera Viewfinder"}</span>
            <button
              onClick={() => setCameraActive(false)}
              className="bg-red-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>
          <div className="relative h-64 bg-zinc-900 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute border-2 border-dashed border-yellow-400 w-48 h-48 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="bg-black/60 text-yellow-300 text-xs px-2 py-1 rounded">
                {lang === "te" ? "ఆకును ఇక్కడ ఉంచండి" : "Align Leaf Here"}
              </span>
            </div>
          </div>
          <div className="p-3 bg-zinc-900 flex justify-center space-x-3">
            <button
              onClick={captureCameraFrame}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-full shadow-lg transition-transform active:scale-95 text-sm flex items-center space-x-1.5"
            >
              <span>📸</span>
              <span>{lang === "te" ? "ఫోటో తీయి & స్కాన్ చేయి" : "Snap & Scan"}</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2.5 px-4 rounded-full text-sm flex items-center space-x-1"
            >
              <span>📁</span>
              <span>{lang === "te" ? "గ్యాలరీ" : "Upload"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Assistant Pulsating Mic Orb */}
      <div className="flex flex-col items-center my-2">
        <button
          onClick={toggleListening}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-2xl transition-all active:scale-90 ${
            isListening
              ? "bg-red-600 text-white pulse-mic shadow-red-500/50"
              : "bg-gradient-to-tr from-emerald-700 to-green-500 text-white shadow-green-600/40 hover:scale-105"
          }`}
        >
          🎙️
        </button>
        <span className="text-xs sm:text-sm font-semibold text-emerald-900 mt-2">
          {isListening
            ? lang === "te"
              ? "వినబడుతోంది... మాట్లాడండి..."
              : "Listening... Speak your query..."
            : lang === "te"
            ? "మైక్ నొక్కండి లేదా మాట్లాడండి (Tap to Speak)"
            : "Tap Mic or Speak naturally"}
        </span>
      </div>

      {/* Quick Prompts Chips */}
      <div className="w-full max-w-lg my-3">
        <p className="text-xs font-semibold text-emerald-950 mb-1.5 px-1">
          💡 {lang === "te" ? "త్వరిత వాయిస్ ఆదేశాలు:" : "Quick Spoken Prompts:"}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {quickPrompts.map((qp, index) => (
            <button
              key={index}
              onClick={() => {
                if (qp.label === "Irrigation" || qp.label === "నీటిపారుదల") {
                  setIrrigationModalOpen(true);
                } else {
                  handleSendMessage(qp.text);
                }
              }}
              className="bg-white/80 hover:bg-white text-emerald-900 text-xs font-medium py-2 px-2.5 rounded-xl border border-emerald-200 shadow-sm transition-all text-left active:scale-95 flex items-center justify-between"
            >
              <span className="truncate">{qp.label}</span>
              <span className="text-[10px] text-emerald-600">➔</span>
            </button>
          ))}
        </div>
      </div>

      {/* Irrigation Recommendation Input Modal */}
      {irrigationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-emerald-200 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💧</span>
                <h3 className="font-extrabold text-sm text-emerald-950">
                  {lang === "te" ? "స్మార్ట్ నీటిపారుదల సలహాదారు" : "Smart Irrigation Advisor"}
                </h3>
              </div>
              <button
                onClick={() => setIrrigationModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold bg-zinc-100 rounded-full w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              {lang === "te"
                ? "మీ పంట రకం మరియు ప్రస్తుత పెరుగుదల దశను ఎంచుకోండి:"
                : "Select your crop type and current growth stage for rainfall-calibrated watering advice:"}
            </p>

            {/* Crop Selector Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 block">
                🌾 {lang === "te" ? "పంట రకం (Crop Type):" : "Crop Type:"}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full bg-emerald-50/80 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-emerald-600"
              >
                <option value="tomato">🍅 {lang === "te" ? "టమాటా (Tomato)" : "Tomato"}</option>
                <option value="rice">🌾 {lang === "te" ? "వరి (Rice / Paddy)" : "Rice (Paddy)"}</option>
                <option value="chilli">🌶️ {lang === "te" ? "మిరప (Chilli)" : "Chilli (Mirchi)"}</option>
                <option value="cotton">🌿 {lang === "te" ? "పత్తి (Cotton)" : "Cotton"}</option>
                <option value="groundnut">🥜 {lang === "te" ? "వేరుశనగ (Groundnut)" : "Groundnut"}</option>
                <option value="maize">🌽 {lang === "te" ? "మొక్కజొన్న (Maize)" : "Maize (Corn)"}</option>
                <option value="sugarcane">🎋 {lang === "te" ? "చెరకు (Sugarcane)" : "Sugarcane"}</option>
                <option value="wheat">🌾 {lang === "te" ? "గోధుమ (Wheat)" : "Wheat"}</option>
              </select>
            </div>

            {/* Growth Stage Selector Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 block">
                🌱 {lang === "te" ? "పెరుగుదల దశ (Growth Stage):" : "Growth Stage:"}
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-emerald-50/80 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-emerald-600"
              >
                <option value="sowing">🌱 {lang === "te" ? "విత్తే / నాటే దశ (Sowing)" : "Sowing / Germination"}</option>
                <option value="vegetative">🌿 {lang === "te" ? "శాకీయ ఎదుగుదల దశ (Vegetative)" : "Vegetative Growth"}</option>
                <option value="flowering">🌸 {lang === "te" ? "పూత / కాయ దశ (Flowering - Critical)" : "Flowering / Fruit Formation (Critical)"}</option>
                <option value="harvest">🌾 {lang === "te" ? "కోత దశ (Harvest / Maturity)" : "Harvest / Maturity"}</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIrrigationModalOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200"
              >
                {lang === "te" ? "రద్దు చేయి" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleIrrigationSubmit}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-1.5 rounded-full text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1"
              >
                <span>💧</span>
                <span>{lang === "te" ? "సలహా పొందండి" : "Get Advice"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: AI Chat Copilot View */}
      {activeTab === "chat" && (
        <div className="w-full max-w-lg flex flex-col space-y-3 mt-1 flex-grow">
          {loading && (
            <div className="bg-white/90 border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-center space-x-3 animate-pulse">
              <div className="w-6 h-6 bg-emerald-500 rounded-full animate-bounce"></div>
              <span className="text-sm font-medium text-emerald-800">
                {lang === "te" ? "సలహా విశ్లేషిస్తున్నాము..." : "Processing agricultural query..."}
              </span>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              {msg.sender === "user" ? (
                <div className="bg-emerald-700 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] shadow-md text-sm">
                  <p className="font-normal">{msg.text}</p>
                  <span className="text-[10px] text-emerald-200 block text-right mt-1">
                    {msg.timestamp}
                  </span>
                </div>
              ) : (
                <div className="w-full bg-white border border-emerald-100 rounded-2xl rounded-tl-none p-4 shadow-md">
                  {msg.actionName && (
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-2">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        🎯 {msg.actionName}
                      </span>
                      {msg.diagnosisData && msg.confidence && (
                        <span className="bg-amber-100 text-amber-900 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          ✨ {msg.confidence}% Match
                        </span>
                      )}
                    </div>
                  )}
                  {msg.diagnosisData ? (
                    <div className="mt-2 space-y-3">
                      {/* Urgency Badge & Escalation Alert */}
                      {msg.diagnosisData.reasoning && (
                        <div>
                          {/* Low-Confidence Escalation Warning */}
                          {msg.diagnosisData.reasoning.is_escalated && (
                            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 mb-2 text-red-900 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-xs flex items-center space-x-1">
                                  <span>⚠️</span>
                                  <span>{lang === "te" ? "స్పష్టత లేని స్కాన్ (Escalated)" : "Inconclusive Scan — Escalated"}</span>
                                </span>
                                <p className="text-[11px] mt-0.5 text-red-800">
                                  {msg.diagnosisData.reasoning.escalation_reason}
                                </p>
                              </div>
                              <a
                                href="tel:18001801551"
                                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm"
                              >
                                📞 {lang === "te" ? "కాల్ చేయండి" : "Call KCC"}
                              </a>
                            </div>
                          )}

                          {/* Urgency Level Ribbon */}
                          <div
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                              msg.diagnosisData.reasoning.urgency_level === "CRITICAL"
                                ? "bg-red-50 border-red-300 text-red-800"
                                : msg.diagnosisData.reasoning.urgency_level === "MODERATE"
                                ? "bg-amber-50 border-amber-300 text-amber-900"
                                : "bg-emerald-50 border-emerald-300 text-emerald-900"
                            }`}
                          >
                            <span>🚨 {msg.diagnosisData.reasoning.urgency_label}</span>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full shadow-xs">
                              {msg.diagnosisData.reasoning.urgency_level}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Severity & Physical Metrics */}
                      <div className="grid grid-cols-3 gap-2 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100 text-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">
                            {lang === "te" ? "తీవ్రత" : "Severity"}
                          </span>
                          <span className="text-xs font-bold text-red-600">
                            {msg.diagnosisData.severity}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">
                            {lang === "te" ? "దెబ్బతిన్న విస్తీర్ణం" : "Damage Area"}
                          </span>
                          <span className="text-xs font-bold text-amber-700">
                            {msg.diagnosisData.affectedAreaPct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">
                            {lang === "te" ? "పచ్చదనం/బలం" : "Green Vigor"}
                          </span>
                          <span className="text-xs font-bold text-emerald-700">
                            {msg.diagnosisData.chlorophyllVigorPct}%
                          </span>
                        </div>
                      </div>

                      {/* COST-TIERED TREATMENT MATRIX */}
                      {msg.diagnosisData.reasoning ? (
                        <div className="space-y-2">
                          {/* Tier 1: Organic / Bio Control */}
                          <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1">
                                <span>🌿</span>
                                <span>{lang === "te" ? "టైర్ 1: సేంద్రీయ నివారణ (అతి తక్కువ ఖర్చు)" : "Tier 1: Bio / Organic (Lowest Cost)"}</span>
                              </span>
                              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                                💰 {msg.diagnosisData.reasoning.tier_1_organic.cost_inr}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-900 font-semibold mt-1">
                              {msg.diagnosisData.reasoning.tier_1_organic.name}
                            </p>
                            <p className="text-[11px] text-zinc-600 mt-0.5">
                              📌 <b>{lang === "te" ? "మోతాదు" : "Dosage"}:</b> {msg.diagnosisData.reasoning.tier_1_organic.dosage}
                            </p>
                            
                            {/* Biological Patience Window Counter */}
                            <div className="mt-2 bg-emerald-100/70 border-l-3 border-emerald-600 p-2 rounded-r-lg">
                              <span className="text-[11px] font-bold text-emerald-900 flex items-center space-x-1">
                                <span>⏳</span>
                                <span>
                                  {lang === "te"
                                    ? `ఆశించిన సమయం: ${msg.diagnosisData.reasoning.tier_1_organic.result_days}`
                                    : `Expected Timeline: ${msg.diagnosisData.reasoning.tier_1_organic.result_days}`}
                                </span>
                              </span>
                              <p className="text-[10px] text-emerald-950 mt-0.5 leading-tight">
                                🛡️ {msg.diagnosisData.reasoning.tier_1_organic.patience_note}
                              </p>
                            </div>
                          </div>

                          {/* Tier 2: Moderate Contact Chemical */}
                          <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-950 flex items-center space-x-1">
                                <span>🧪</span>
                                <span>{lang === "te" ? "టైర్ 2: సంప్రదాయ రసాయన మందు" : "Tier 2: Contact Protectant (Standard)"}</span>
                              </span>
                              <span className="text-[11px] font-extrabold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                                💰 {msg.diagnosisData.reasoning.tier_2_moderate.cost_inr}
                              </span>
                            </div>
                            <p className="text-xs text-amber-950 font-semibold mt-1">
                              {msg.diagnosisData.reasoning.tier_2_moderate.name}
                            </p>
                            <p className="text-[11px] text-zinc-600 mt-0.5">
                              📌 <b>{lang === "te" ? "మోతాదు" : "Dosage"}:</b> {msg.diagnosisData.reasoning.tier_2_moderate.dosage}
                            </p>
                          </div>

                          {/* Tier 3: Emergency Systemic Curative */}
                          <div className="bg-zinc-50 border border-zinc-300 rounded-xl p-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800 flex items-center space-x-1">
                                <span>🔬</span>
                                <span>{lang === "te" ? "టైర్ 3: అత్యవసర సిస్టమిక్ మందు (అధిక ఖర్చు)" : "Tier 3: Systemic Curative (High Tier)"}</span>
                              </span>
                              <span className="text-[11px] font-extrabold text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded-full">
                                💰 {msg.diagnosisData.reasoning.tier_3_systemic.cost_inr}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-900 font-semibold mt-1">
                              {msg.diagnosisData.reasoning.tier_3_systemic.name}
                            </p>
                            <p className="text-[11px] text-zinc-600 mt-0.5">
                              📌 <b>{lang === "te" ? "మోతాదు" : "Dosage"}:</b> {msg.diagnosisData.reasoning.tier_3_systemic.dosage}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Fallback organic / chemical */}
                          <div className="bg-green-50/90 border-l-4 border-green-600 p-2.5 rounded-r-xl">
                            <span className="text-xs font-bold text-green-900 flex items-center space-x-1">
                              <span>🌿</span>
                              <span>{lang === "te" ? "సేంద్రీయ నివారణ:" : "Organic Remedy:"}</span>
                            </span>
                            <p className="text-xs text-green-950 mt-1">{msg.diagnosisData.organicCure}</p>
                          </div>
                          <div className="bg-amber-50/90 border-l-4 border-amber-600 p-2.5 rounded-r-xl">
                            <span className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                              <span>🧪</span>
                              <span>{lang === "te" ? "రసాయన మందు & మోతాదు:" : "Chemical Dosage:"}</span>
                            </span>
                            <p className="text-xs text-amber-950 mt-1">{msg.diagnosisData.chemicalCure}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.weatherData ? (
                    <div className="mt-2 space-y-3">
                      {/* Live Spray Safety Badge */}
                      <div
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${
                          msg.weatherData.spray_status === "UNSAFE"
                            ? "bg-red-50 border-red-300 text-red-900"
                            : msg.weatherData.spray_status === "CAUTION"
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "bg-emerald-50 border-emerald-300 text-emerald-900"
                        }`}
                      >
                        <span className="text-sm">🌦️ {msg.weatherData.spray_badge}</span>
                        <span className="text-[10px] bg-white px-2.5 py-1 rounded-full shadow-xs uppercase">
                          {msg.weatherData.spray_status}
                        </span>
                      </div>

                      {/* Live Weather Metrics Grid */}
                      <div className="grid grid-cols-4 gap-1.5 bg-blue-50/70 p-2.5 rounded-2xl border border-blue-200 text-center">
                        <div className="bg-white/80 p-1.5 rounded-xl">
                          <span className="text-[10px] text-zinc-500 block">🌡️ {lang === "te" ? "ఉష్ణోగ్రత" : "Temp"}</span>
                          <span className="text-xs font-extrabold text-blue-950">{msg.weatherData.temperature}°C</span>
                        </div>
                        <div className="bg-white/80 p-1.5 rounded-xl">
                          <span className="text-[10px] text-zinc-500 block">💧 {lang === "te" ? "తేమ" : "Humidity"}</span>
                          <span className="text-xs font-extrabold text-blue-950">{msg.weatherData.humidity}%</span>
                        </div>
                        <div className="bg-white/80 p-1.5 rounded-xl">
                          <span className="text-[10px] text-zinc-500 block">💨 {lang === "te" ? "గాలి" : "Wind"}</span>
                          <span className="text-xs font-extrabold text-blue-950">{msg.weatherData.wind_speed} <span className="text-[9px]">km/h</span></span>
                        </div>
                        <div className="bg-white/80 p-1.5 rounded-xl">
                          <span className="text-[10px] text-zinc-500 block">🌧️ {lang === "te" ? "వర్షం" : "Rain"}</span>
                          <span className="text-xs font-extrabold text-blue-950">{msg.weatherData.rain_prob_6h}%</span>
                        </div>
                      </div>

                      {/* Safe Spray Window Box */}
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-600 p-3 rounded-r-2xl shadow-xs">
                        <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1">
                          <span>⏰</span>
                          <span>{lang === "te" ? "పిచికారీకి అనుకూల సమయం (Best Window):" : "Recommended Spray Window:"}</span>
                        </span>
                        <p className="text-xs text-emerald-900 font-semibold mt-1">
                          {msg.weatherData.safe_window}
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-1">
                          📢 {msg.weatherData.spray_advice}
                        </p>
                      </div>
                    </div>
                  ) : msg.irrigationData ? (
                    <div className="mt-2 space-y-3">
                      {/* Primary Irrigation Verdict Badge */}
                      <div
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${
                          msg.irrigationData.recommendation.toLowerCase().includes("skip") ||
                          msg.irrigationData.recommendation.includes("పెట్టవద్దు")
                            ? "bg-blue-50 border-blue-300 text-blue-950"
                            : msg.irrigationData.recommendation.toLowerCase().includes("today") ||
                              msg.irrigationData.recommendation.includes("ఈరోజు")
                            ? "bg-amber-50 border-amber-300 text-amber-950"
                            : "bg-emerald-50 border-emerald-300 text-emerald-950"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">💧</span>
                          <span className="text-xs sm:text-sm font-extrabold">{msg.irrigationData.recommendation}</span>
                        </div>
                        <span className="text-[10px] bg-white px-2.5 py-1 rounded-full shadow-xs font-bold text-zinc-700">
                          {msg.irrigationData.growth_stage}
                        </span>
                      </div>

                      {/* Agronomic Details Card */}
                      <div className="bg-cyan-50/80 border border-cyan-200 rounded-2xl p-3.5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-cyan-950 flex items-center space-x-1">
                            <span>🌱</span>
                            <span>{lang === "te" ? "పంట రకం & దశ:" : "Crop & Stage:"}</span>
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded-md font-semibold text-cyan-900 border border-cyan-100">
                            {msg.irrigationData.crop_type} ({msg.irrigationData.growth_stage})
                          </span>
                        </div>

                        <p className="text-xs text-cyan-950 leading-relaxed font-medium bg-white/70 p-2 rounded-xl border border-cyan-100">
                          📌 {msg.irrigationData.reason}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="bg-white p-2 rounded-xl border border-cyan-100 text-center">
                            <span className="text-[10px] text-zinc-500 block">
                              🌧️ {lang === "te" ? "రాబోయే వర్షపాతం" : "Expected Rainfall"}
                            </span>
                            <span className="text-xs font-extrabold text-cyan-900">
                              {msg.irrigationData.rainfall_expected_mm} mm
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-cyan-100 text-center">
                            <span className="text-[10px] text-zinc-500 block">
                              📅 {lang === "te" ? "తదుపరి సమీక్ష తేదీ" : "Next Check Date"}
                            </span>
                            <span className="text-xs font-extrabold text-cyan-900">
                              {msg.irrigationData.next_check_date}
                            </span>
                          </div>
                        </div>

                        <span className="text-[9px] text-cyan-800/80 block text-right italic pt-1">
                          ℹ️ {msg.irrigationData.confidence}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-800 leading-relaxed font-normal">
                      {msg.text}
                    </p>
                  )}

                {msg.audioB64 && (
                  <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (audioPlayerRef.current) {
                          audioPlayerRef.current.src = msg.audioB64!;
                          audioPlayerRef.current.play();
                        }
                      }}
                      className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                    >
                      <span>🔊 {lang === "te" ? "వినండి (Listen)" : "Listen"}</span>
                    </button>
                    <span className="text-[10px] text-zinc-400">{msg.timestamp}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
          {/* Extra Bottom Spacer so fixed input bar never overlaps last card */}
          <div className="h-10 w-full" />
        </div>
      )}

      {/* Tab 2: My Crops Farm Dashboard View */}
      {activeTab === "crops" && (
        <div className="w-full max-w-lg flex flex-col space-y-4 mt-1 flex-grow">
          <div className="flex items-center justify-between bg-white/90 border border-emerald-200 rounded-2xl p-3.5 shadow-sm">
            <div>
              <h2 className="text-sm font-extrabold text-emerald-950">
                🌱 {lang === "te" ? "నా సాగు పంటలు" : "My Saved Crops"}
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {lang === "te"
                  ? "మీ పొలంలో సాగుచేస్తున్న పంటల దశవారీ హెచ్చరికలు"
                  : "Track stage-specific pest risks & timely precautions"}
              </p>
            </div>
            <button
              onClick={() => setAddCropModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-md active:scale-95 transition-all flex items-center space-x-1"
            >
              <span>+</span>
              <span>{lang === "te" ? "పంటను జోడించు" : "Add Crop"}</span>
            </button>
          </div>

          {/* Empty State */}
          {savedCrops.length === 0 && (
            <div className="bg-white/80 border-2 border-dashed border-emerald-300 rounded-3xl p-8 text-center space-y-3 my-4">
              <span className="text-4xl block">🌾</span>
              <h3 className="text-sm font-bold text-emerald-950">
                {lang === "te" ? "ఇంకా పంటలు జోడించలేదు" : "No crops saved yet"}
              </h3>
              <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                {lang === "te"
                  ? "మీ పొలంలోని పంటలను ఒకే ట్యాప్‌తో జోడించి దశలవారీగా పురుగులు మరియు తెగుళ్ల హెచ్చరికలు పొందండి."
                  : "Add your farm crops with one tap to get stage-specific pest warnings & timely precautions."}
              </p>
              <button
                onClick={() => setAddCropModalOpen(true)}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md"
              >
                + {lang === "te" ? "మొదటి పంటను జోడించు" : "Add Your First Crop"}
              </button>
            </div>
          )}

          {/* Saved Crops Cards List */}
          <div className="space-y-3.5">
            {savedCrops.map((crop) => {
              const cropMeta: Record<string, { icon: string; name_en: string; name_te: string }> = {
                rice: { icon: "🌾", name_en: "Rice (Paddy)", name_te: "వరి (Rice)" },
                cotton: { icon: "🌿", name_en: "Cotton", name_te: "పత్తి (Cotton)" },
                groundnut: { icon: "🥜", name_en: "Groundnut", name_te: "వేరుశనగ (Groundnut)" },
                maize: { icon: "🌽", name_en: "Maize (Corn)", name_te: "మొక్కజొన్న (Maize)" },
                tomato: { icon: "🍅", name_en: "Tomato", name_te: "టమాటా (Tomato)" },
                chilli: { icon: "🌶️", name_en: "Chilli (Mirchi)", name_te: "మిరప (Chilli)" },
                sugarcane: { icon: "🎋", name_en: "Sugarcane", name_te: "చెరకు (Sugarcane)" },
                wheat: { icon: "🌾", name_en: "Wheat", name_te: "గోధుమ (Wheat)" },
              };
              const meta = cropMeta[crop.crop_type.toLowerCase()] || {
                icon: "🌱",
                name_en: crop.crop_type,
                name_te: crop.crop_type,
              };

              return (
                <div
                  key={crop.id}
                  className="bg-white border border-emerald-200 rounded-3xl p-4 shadow-md space-y-3 transition-all hover:shadow-lg"
                >
                  {/* Crop Header */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-2xl p-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                        {meta.icon}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-sm text-zinc-900">
                          {lang === "te" ? meta.name_te : meta.name_en}
                        </h3>
                        <span className="text-[10px] text-zinc-400">
                          {lang === "te" ? "జోడించిన తేదీ" : "Added"}: {crop.added_date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setStageModalTargetCrop(crop)}
                        disabled={stageLoadingId === crop.id}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs px-3 py-1.5 rounded-full border border-emerald-300 transition-all active:scale-95 flex items-center space-x-1"
                      >
                        <span>📢</span>
                        <span>
                          {stageLoadingId === crop.id
                            ? lang === "te" ? "లోడ్ అవుతోంది..." : "Loading..."
                            : crop.last_alert
                            ? lang === "te" ? "మళ్లీ తనిఖీ చేయి" : "Re-Check Stage"
                            : lang === "te" ? "హెచ్చరికలు లోడ్ చేయి" : "Load Alerts"}
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteCrop(crop.id)}
                        className="text-zinc-300 hover:text-red-500 text-xs p-1.5 rounded-full"
                        title="Remove Crop"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Alerts Area */}
                  {crop.last_alert ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          🌱 {lang === "te" ? "ప్రస్తుత దశ" : "Stage"}: {crop.last_alert.stage}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {lang === "te" ? "నవీకరించబడింది" : "Checked"}: {crop.last_alert.updated_at}
                        </span>
                      </div>

                      {crop.last_alert.risks.map((risk, rIdx) => (
                        <div
                          key={rIdx}
                          className="bg-amber-50/70 border-l-4 border-amber-500 rounded-r-2xl p-3 space-y-1.5"
                        >
                          <div className="flex items-center space-x-1 text-xs font-bold text-amber-950">
                            <span>⚠️</span>
                            <span>{risk.risk_name}</span>
                          </div>
                          <p className="text-[11px] text-zinc-700 leading-relaxed">
                            🔍 <b>{lang === "te" ? "గమనించాల్సిన లక్షణాలు" : "What to look for"}:</b>{" "}
                            {risk.what_to_look_for}
                          </p>
                          <p className="text-[11px] text-emerald-950 font-semibold bg-white/80 p-2 rounded-xl border border-emerald-200 leading-relaxed">
                            🛡️ <b>{lang === "te" ? "చేయాల్సిన పని" : "Action step"}:</b> {risk.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Default Blank/Placeholder Alert State */
                    <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-3 text-center text-xs text-zinc-500 space-y-1">
                      <span>🔔</span>
                      <p>
                        {lang === "te"
                          ? "ఈ పంటకు హెచ్చరికలు లోడ్ చేయడానికి 'హెచ్చరికలు లోడ్ చేయి' బటన్ నొక్కండి."
                          : "Tap 'Load Alerts' to check stage-specific risks & precautions for this crop."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Bottom spacer */}
          <div className="h-10 w-full" />
        </div>
      )}

      {/* Modal 1: Add a Crop (Visual 8-Crop Grid) */}
      {addCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-emerald-200 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🌾</span>
                <h3 className="font-extrabold text-sm text-emerald-950">
                  {lang === "te" ? "పంటను ఎంచుకోండి (1-Tap)" : "Pick Crop to Add (1-Tap)"}
                </h3>
              </div>
              <button
                onClick={() => setAddCropModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold bg-zinc-100 rounded-full w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              {lang === "te"
                ? "మీ పొలంలో సాగుచేస్తున్న పంటను ఎంచుకోండి:"
                : "Tap any crop below to add it immediately to your farm list:"}
            </p>

            {/* Visual 8-Crop Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "tomato", icon: "🍅", name_en: "Tomato", name_te: "టమాటా (Tomato)" },
                { id: "rice", icon: "🌾", name_en: "Rice (Paddy)", name_te: "వరి (Rice)" },
                { id: "chilli", icon: "🌶️", name_en: "Chilli (Mirchi)", name_te: "మిరప (Chilli)" },
                { id: "cotton", icon: "🌿", name_en: "Cotton", name_te: "పత్తి (Cotton)" },
                { id: "groundnut", icon: "🥜", name_en: "Groundnut", name_te: "వేరుశనగ (Groundnut)" },
                { id: "maize", icon: "🌽", name_en: "Maize (Corn)", name_te: "మొక్కజొన్న (Maize)" },
                { id: "sugarcane", icon: "🎋", name_en: "Sugarcane", name_te: "చెరకు (Sugarcane)" },
                { id: "wheat", icon: "🌾", name_en: "Wheat", name_te: "గోధుమ (Wheat)" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAddCrop(c.id)}
                  className="bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 rounded-2xl p-3 flex items-center space-x-2 text-left active:scale-95 transition-all shadow-xs"
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-bold text-emerald-950 leading-tight">
                    {lang === "te" ? c.name_te : c.name_en}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Growth Stage One-Question Prompt */}
      {stageModalTargetCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-emerald-200 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🌱</span>
                <h3 className="font-extrabold text-sm text-emerald-950">
                  {lang === "te"
                    ? `మీ ${stageModalTargetCrop.crop_type} ఏ దశలో ఉంది?`
                    : `What stage is your ${stageModalTargetCrop.crop_type} in?`}
                </h3>
              </div>
              <button
                onClick={() => setStageModalTargetCrop(null)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold bg-zinc-100 rounded-full w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              {lang === "te"
                ? "ప్రస్తుత పెరుగుదల దశను ఎంచుకుని తగిన నివారణ జాగ్రత్తలు పొందండి:"
                : "Select current growth stage to get plain-language risks and action steps:"}
            </p>

            {/* 5 Plain-Language Stage Option Buttons */}
            <div className="space-y-2">
              {[
                {
                  id: "Just planted",
                  icon: "🌰",
                  title_en: "Just planted",
                  subtitle_en: "Seeds germinating / young nursery",
                  title_te: "ఇప్పుడే విత్తనం వేశాము",
                  subtitle_te: "మొలకలు వచ్చే దశ / లేత నారు",
                },
                {
                  id: "Growing (leaves & stem)",
                  icon: "🌿",
                  title_en: "Growing (leaves & stem)",
                  subtitle_en: "Branching and vegetative canopy",
                  title_te: "ఎదుగుదల దశ (ఆకులు, కొమ్మలు)",
                  subtitle_te: "శాకీయ ఎదుగుదల మరియు పిలకలు",
                },
                {
                  id: "Flowering",
                  icon: "🌸",
                  title_en: "Flowering",
                  subtitle_en: "Flower buds and initial setting",
                  title_te: "పూత దశ",
                  subtitle_te: "మొగ్గలు మరియు పూత సమయం",
                },
                {
                  id: "Fruit/grain forming",
                  icon: "🍅",
                  title_en: "Fruit/grain forming",
                  subtitle_en: "Pod, fruit or grain filling",
                  title_te: "కాయ / గింజ కట్టే దశ",
                  subtitle_te: "గింజ పాలు పోసుకోవడం / కాయ ఎదుగుదల",
                },
                {
                  id: "Almost ready to harvest",
                  icon: "🌾",
                  title_en: "Almost ready to harvest",
                  subtitle_en: "Maturity & ripening",
                  title_te: "కోతకు సిద్ధంగా ఉంది",
                  subtitle_te: "పంట పక్వానికి వచ్చిన సమయం",
                },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleFetchStagePrecautions(stageModalTargetCrop, s.id)}
                  className="w-full bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded-2xl p-3 flex items-center space-x-3 text-left transition-all active:scale-95"
                >
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      {lang === "te" ? s.title_te : s.title_en}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {lang === "te" ? s.subtitle_te : s.subtitle_en}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-emerald-200 p-3 flex justify-center shadow-lg z-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="w-full max-w-lg flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              lang === "te"
                ? "మీ ప్రశ్న మాట్లాడండి లేదా టైప్ చేయండి..."
                : "Speak or type your farming question..."
            }
            className="flex-grow bg-emerald-50/70 border border-emerald-300 focus:border-emerald-600 rounded-full px-4 py-2.5 text-sm outline-none text-zinc-800"
          />
          {/* Hidden File Input for Gallery */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageDiagnosis(e.target.files[0]);
              }
            }}
          />

          {/* Hidden Camera Input for Mobile Direct Capture */}
          <input
            type="file"
            id="mobileCameraInput"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageDiagnosis(e.target.files[0]);
              }
            }}
          />

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
                setCameraActive((prev) => !prev);
              } else {
                document.getElementById("mobileCameraInput")?.click();
              }
            }}
            title="Open Camera"
            className="p-3 rounded-full text-emerald-800 bg-emerald-100 hover:bg-emerald-200 active:scale-95 transition-all text-base"
          >
            📷
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Leaf Photo"
            className="p-3 rounded-full text-emerald-800 bg-emerald-100 hover:bg-emerald-200 active:scale-95 transition-all text-base"
          >
            📁
          </button>
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-full text-white active:scale-95 transition-all text-base ${
              isListening ? "bg-red-600 animate-pulse" : "bg-emerald-700 hover:bg-emerald-600"
            }`}
          >
            🎙️
          </button>
          <button
            type="submit"
            className="bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-full text-sm shadow-md transition-all"
          >
            ➔
          </button>
        </form>
      </div>
    </main>
  );
}
