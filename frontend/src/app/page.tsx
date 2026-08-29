"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  soilData?: {
    nitrogen: { value: number; unit: string; status: string; label: string; advice: string; band_key: string };
    phosphorus: { value: number; unit: string; status: string; label: string; advice: string; band_key: string };
    potassium: { value: number; unit: string; status: string; label: string; advice: string; band_key: string };
    ph: { value: number; unit: string; status: string; label: string; advice: string; band_key: string };
    crop_fit?: { is_well_suited: boolean; verdict: string; badge: string };
    overall_summary: string;
    disclaimer: string;
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
  const [currentScreen, setCurrentScreen] = useState<"home" | "camera" | "ask" | "crops">("home");
  const [lang, setLang] = useState<"te" | "en">("te");
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 17.3850, lon: 78.4867 });
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [irrigationModalOpen, setIrrigationModalOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("tomato");
  const [selectedStage, setSelectedStage] = useState("flowering");
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Progressive Disclosure: Set of message IDs that have details expanded
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  // Accordion for "Weather & Tips" on home screen
  const [showWeatherAccordion, setShowWeatherAccordion] = useState(false);

  // Drawer state for Screen 3
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Soil Health Card State
  const [soilHealthModalOpen, setSoilHealthModalOpen] = useState(false);
  const [soilTargetCrop, setSoilTargetCrop] = useState<string>("tomato");
  const [soilN, setSoilN] = useState<string>("240");
  const [soilP, setSoilP] = useState<string>("15");
  const [soilK, setSoilK] = useState<string>("210");
  const [soilPh, setSoilPh] = useState<string>("6.8");
  const [soilSubmitting, setSoilSubmitting] = useState(false);

  // My Crops State (localStorage backed)
  const [savedCrops, setSavedCrops] = useState<SavedCrop[]>([]);
  const [addCropModalOpen, setAddCropModalOpen] = useState(false);
  const [stageModalTargetCrop, setStageModalTargetCrop] = useState<SavedCrop | null>(null);
  const [stageLoadingId, setStageLoadingId] = useState<string | null>(null);

  // First-time Onboarding State (Step 1: Language & Single Crop Selection)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSelectedCrop, setOnboardingSelectedCrop] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (currentScreen === "ask") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentScreen, loading]);

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

  // Check Onboarding & Load saved crop
  useEffect(() => {
    setMounted(true);
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

  const handleCompleteOnboarding = async () => {
    if (onboardingSelectedCrop) {
      const newCrop: SavedCrop = {
        id: `${Date.now()}_${onboardingSelectedCrop}`,
        crop_type: onboardingSelectedCrop,
        added_date: new Date().toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }),
        current_stage: "Growing (leaves & stem)",
      };
      saveCropsToStorage([newCrop]);
      // Auto fetch default stage alerts for immediate visibility
      handleFetchStagePrecautions(newCrop, "Growing (leaves & stem)");
    }
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("agrisahayak_onboarded", "true");
    }
  };

  const selectOnboardingCrop = (cropId: string) => {
    setOnboardingSelectedCrop(cropId);
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
          `http://${API_BASE}:8000/api/weather/advisory?lat=${coords.lat}&lon=${coords.lon}&lang=${lang}`
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

  // Re-fetch stage alerts in the active language when language changes
  useEffect(() => {
    if (mounted && savedCrops.length > 0) {
      savedCrops.forEach((c) => {
        const stage = c.current_stage || "Growing (leaves & stem)";
        handleFetchStagePrecautions(c, stage);
      });
    }
  }, [lang]);

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
    if (currentScreen === "camera" && navigator.mediaDevices) {
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
          document.getElementById("mobileCameraInput")?.click();
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [currentScreen]);

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

    setCurrentScreen("ask");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`http://${API_BASE}:8000/api/voice/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanText, lang, lat: coords.lat, lon: coords.lon }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (data.intent === "OPEN_CAMERA") {
        setCurrentScreen("camera");
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

      setMessages((prev) => [...prev, botMsg]);

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
      setMessages((prev) => [...prev, errorMsg]);
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
    setMessages((prev) => [...prev, userMsg]);

    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`http://${API_BASE}:8000/api/irrigation/recommend`, {
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

      setMessages((prev) => [...prev, botMsg]);

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
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Submit Soil Health Card Analysis
  const handleSoilSubmit = async () => {
    const numN = parseFloat(soilN) || 0;
    const numP = parseFloat(soilP) || 0;
    const numK = parseFloat(soilK) || 0;
    const numPh = parseFloat(soilPh) || 7.0;

    const cropNames: Record<string, { en: string; te: string }> = {
      tomato: { en: "Tomato", te: "టమాటా" },
      rice: { en: "Rice", te: "వరి" },
      chilli: { en: "Chilli", te: "మిరప" },
      cotton: { en: "Cotton", te: "పత్తి" },
      groundnut: { en: "Groundnut", te: "వేరుశనగ" },
      maize: { en: "Maize", te: "మొక్కజొన్న" },
      sugarcane: { en: "Sugarcane", te: "చెరకు" },
      wheat: { en: "Wheat", te: "గోధుమ" },
    };
    const cropLabel = cropNames[soilTargetCrop.toLowerCase()]?.[lang] || soilTargetCrop;

    const userPrompt =
      lang === "te"
        ? `🧪 నేల పరీక్ష విశ్లేషణ (${cropLabel}): N=${numN}, P=${numP}, K=${numK}, pH=${numPh}`
        : `🧪 Soil Health Analysis (${cropLabel}): N=${numN}, P=${numP}, K=${numK}, pH=${numPh}`;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setCurrentScreen("ask");
    setLoading(true);
    setSoilSubmitting(true);

    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`http://${API_BASE}:8000/api/soil/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n: numN,
          p: numP,
          k: numK,
          ph: numPh,
          crop_type: soilTargetCrop,
          lang,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: data.overall_summary,
        intent: "SOIL_HEALTH",
        confidence: 98,
        actionName: `${cropLabel}: ${lang === "te" ? "నేల ఆరోగ్య కార్డు" : "Soil Health Card"}`,
        audioB64: data.audio_b64,
        soilData: {
          nitrogen: data.nitrogen,
          phosphorus: data.phosphorus,
          potassium: data.potassium,
          ph: data.ph,
          crop_fit: data.crop_fit,
          overall_summary: data.overall_summary,
          disclaimer: data.disclaimer,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (autoSpeak && data.audio_b64 && audioPlayerRef.current) {
        audioPlayerRef.current.src = data.audio_b64;
        audioPlayerRef.current.play().catch((e) => console.log("Audio prevented:", e));
      }
    } catch (err) {
      console.error("Soil analysis request error:", err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text:
          lang === "te"
            ? "నేల పరీక్ష వివరాలను విశ్లేషించడంలో సమస్య ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి."
            : "Could not process soil analysis. Please check your network and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setSoilSubmitting(false);
    }
  };

  // Add a crop (Single crop only at a time)
  const handleAddCrop = (cropType: string) => {
    const newCrop: SavedCrop = {
      id: Date.now().toString(),
      crop_type: cropType,
      added_date: new Date().toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }),
      current_stage: "Growing (leaves & stem)",
    };
    // Keep only this selected crop
    const updated = [newCrop];
    saveCropsToStorage(updated);
    setAddCropModalOpen(false);
    // Auto-fetch alerts
    handleFetchStagePrecautions(newCrop, "Growing (leaves & stem)");
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
      const res = await fetch(`http://${API_BASE}:8000/api/crops/precautions`, {
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
      }
    } catch (err) {
      console.error("Failed to load stage precautions:", err);
    } finally {
      setStageLoadingId(null);
    }
  };

  const handleImageDiagnosis = async (imageBlob: Blob | File) => {
    setLoading(true);
    setCurrentScreen("ask"); // View diagnosis inside the conversation feed

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: lang === "te" ? "📷 ఆకు చిత్రం స్కాన్ చేయబడుతోంది..." : "📷 Scanning crop leaf image...",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

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

      const res = await fetch(`http://${API_BASE}:8000/api/crop/diagnose`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      // Formulate concise voice summary for low-literacy farmers (short version only)
      let conciseVoiceText = "";
      if (data.is_non_plant || data.disease_id === "Not_A_Plant") {
        conciseVoiceText = lang === "te"
          ? "పంట ఆకు గుర్తించబడలేదు. దయచేసి పంట ఆకును స్పష్టంగా కెమెరాలో చూపించి మళ్లీ స్కాన్ చేయండి."
          : "No crop leaf detected. Please point your camera directly at the crop leaf and scan again.";
      } else if (data.reasoning) {
        if (data.reasoning.is_escalated) {
          conciseVoiceText = lang === "te"
            ? "వ్యాధి స్పష్టంగా గుర్తించబడలేదు. ఉచిత కిసాన్ కాల్ సెంటర్ 1800 180 1551 కి కాల్ చేయండి."
            : "Scan inconclusive. Please call free Kisan Helpline 1800-180-1551.";
        } else if (data.disease_name && data.disease_name.toLowerCase().includes("healthy")) {
          conciseVoiceText = lang === "te"
            ? `${data.crop_name} పంట ఆరోగ్యంగా ఉంది. ఎలాంటి మందులు అవసరం లేదు.`
            : `Your ${data.crop_name} is healthy. No treatment needed.`;
        } else {
          const headlineTreatment = data.reasoning.tier_1_organic?.name || data.organic_cure;
          conciseVoiceText = lang === "te"
            ? `${data.crop_name} పంటలో ${data.disease_name} గుర్తించబడింది. అత్యవసరత: ${data.reasoning.urgency_label}. నివారణకు ${headlineTreatment} వాడండి.`
            : `${data.disease_name} detected in ${data.crop_name}. Urgency is ${data.reasoning.urgency_level}. Recommended action: apply ${headlineTreatment}.`;
        }
      }

      // Fetch concise audio if available, or fall back to returned audio
      let finalAudioB64 = data.audio_b64;
      if (conciseVoiceText) {
        try {
          const ttsRes = await fetch(`http://${host}:8000/api/voice/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: conciseVoiceText, lang }),
          });
          if (ttsRes.ok) {
            const ttsData = await ttsRes.json();
            if (ttsData.audio_b64) finalAudioB64 = ttsData.audio_b64;
          }
        } catch (e) {
          console.log("Custom concise TTS fetch error:", e);
        }
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: data.symptoms,
        intent: "SCAN_DISEASE",
        confidence: data.confidence_score,
        actionName: `${data.crop_name}: ${data.disease_name}`,
        audioB64: finalAudioB64,
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

      setMessages((prev) => [...prev, botMsg]);

      if (autoSpeak && finalAudioB64 && audioPlayerRef.current) {
        audioPlayerRef.current.src = finalAudioB64;
        audioPlayerRef.current.play().catch((e) => console.log("Audio prevented:", e));
      }
    } catch (err) {
      console.error("Diagnosis upload error:", err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: lang === "te" ? "చిత్ర విశ్లేషణ విఫలమైంది. దయచేసి ఆకును స్పష్టంగా చూపించి మళ్లీ ప్రయత్నించండి." : "Image analysis failed. Please retry with a clear picture of the leaf.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
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

  const toggleDetails = (msgId: string) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const quickPrompts =
    lang === "te"
      ? [
          { text: "🌦️ రేపు మందు పిచికారీ చేయవచ్చా?", label: "వాతావరణం & పిచికారీ" },
          { text: "💧 నా పంటకు నీళ్లు ఎప్పుడు పెట్టాలి?", label: "నీటిపారుదల" },
          { text: "🌱 ఎంత యూరియా & డీఏపీ వేయాలి?", label: "ఎరువుల మోతాదు" },
          { text: "⚠️ ఈ వాతావరణంలో పురుగుల ముప్పు ఉందా?", label: "తెగుళ్ల ముప్పు" },
        ]
      : [
          { text: "🌦️ Can I spray pesticide tomorrow?", label: "Weather & Spray" },
          { text: "💧 When should I irrigate my crop?", label: "Irrigation Advice" },
          { text: "🌱 How many bags of Urea and DAP to use?", label: "Fertilizer Dose" },
          { text: "⚠️ Any pest outbreak risk in this weather?", label: "Pest Warning" },
        ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. ONBOARDING: LANGUAGE & SINGLE CROP SELECTION PROMPT FIRST
  // -------------------------------------------------------------
  if (showOnboarding) {
    const onboardingCropsList = [
      { id: "tomato", icon: "🍅", name_en: "Tomato", name_te: "టమాటా" },
      { id: "rice", icon: "🌾", name_en: "Rice (Paddy)", name_te: "వరి" },
      { id: "chilli", icon: "🌶️", name_en: "Chilli (Mirchi)", name_te: "మిరప" },
      { id: "cotton", icon: "🌿", name_en: "Cotton", name_te: "పత్తి" },
      { id: "groundnut", icon: "🥜", name_en: "Groundnut", name_te: "వేరుశనగ" },
      { id: "maize", icon: "🌽", name_en: "Maize (Corn)", name_te: "మొక్కజొన్న" },
      { id: "sugarcane", icon: "🎋", name_en: "Sugarcane", name_te: "చెరకు" },
      { id: "wheat", icon: "🌾", name_en: "Wheat", name_te: "గోధుమ" },
    ];

    return (
      <main className="min-h-screen bg-[#FDFCF8] text-[#2A2928] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-[#E5E3DC] rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg">
          {/* 1. Header & Language Selection Prompt */}
          <div className="space-y-3 pb-3 border-b border-[#E5E3DC]">
            <div className="flex items-center space-x-2.5">
              <span className="text-3xl">🌾</span>
              <div>
                <h1 className="font-black text-lg text-[#2D5A27] leading-tight">
                  {lang === "te" ? "అగ్రి సహాయక్" : "AgriSahayak"}
                </h1>
                <span className="text-[11px] text-[#4A4947] font-medium">
                  {lang === "te" ? "రైతు డిజిటల్ సహాయకుడు" : "AI Farming Copilot"}
                </span>
              </div>
            </div>

            {/* Language Prompt Buttons */}
            <div className="bg-[#F3F2EE] p-2.5 rounded-2xl border border-[#E5E3DC] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#2D5A27] block">
                🌐 {lang === "te" ? "మీ భాషను ఎంచుకోండి" : "Choose Your Language"}:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLang("te")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    lang === "te"
                      ? "bg-[#2D5A27] text-white shadow-sm ring-2 ring-[#2D5A27]/40"
                      : "bg-white text-[#4A4947] border border-[#E5E3DC] hover:bg-[#EAF3E8]"
                  }`}
                >
                  <span>తెలుగు</span>
                  {lang === "te" && <span>✓</span>}
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    lang === "en"
                      ? "bg-[#2D5A27] text-white shadow-sm ring-2 ring-[#2D5A27]/40"
                      : "bg-white text-[#4A4947] border border-[#E5E3DC] hover:bg-[#EAF3E8]"
                  }`}
                >
                  <span>English</span>
                  {lang === "en" && <span>✓</span>}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Single Crop Selection Prompt */}
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#2A2928]">
                🌱 {lang === "te" ? "మీ ప్రధాన పంటను ఎంచుకోండి (ఒకటి మాత్రమే)" : "Select Your Main Crop (Choose 1)"}
              </h2>
              <p className="text-[11px] text-[#4A4947] mt-0.5">
                {lang === "te"
                  ? "మీరు ప్రస్తుతం సాగు చేస్తున్న పంటను ఎంచుకోండి:"
                  : "Pick the main crop grown in your field:"}
              </p>
            </div>

            {/* 8-Crop Single Selection Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {onboardingCropsList.map((crop) => {
                const isSelected = onboardingSelectedCrop === crop.id;
                return (
                  <button
                    key={crop.id}
                    onClick={() => selectOnboardingCrop(crop.id)}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex items-center space-x-2.5 ${
                      isSelected
                        ? "bg-[#2D5A27] border-[#2D5A27] text-white shadow-sm ring-2 ring-[#2D5A27]/40"
                        : "bg-[#FDFCF8] hover:bg-[#EAF3E8] border-[#E5E3DC] text-[#2A2928]"
                    }`}
                  >
                    <span className="text-2xl">{crop.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold block truncate ${isSelected ? "text-white" : "text-[#2A2928]"}`}>
                        {lang === "te" ? crop.name_te : crop.name_en}
                      </span>
                      <span className={`text-[10px] ${isSelected ? "text-[#EAF3E8] font-bold" : "text-[#4A4947]"}`}>
                        {isSelected ? (lang === "te" ? "✓ ఎంపికైంది" : "✓ Selected") : (lang === "te" ? "+ ఎంచుకోండి" : "+ Select")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Action Buttons: Skip & Continue */}
          <div className="pt-2 flex items-center justify-between border-t border-[#E5E3DC]">
            <button
              onClick={handleSkipOnboarding}
              className="text-xs font-bold text-[#4A4947] hover:text-[#2A2928] px-3 py-2"
            >
              {lang === "te" ? "దాటవేయి (Skip)" : "Skip for now"}
            </button>
            <button
              onClick={handleCompleteOnboarding}
              disabled={!onboardingSelectedCrop}
              className={`font-bold text-xs px-6 py-3 rounded-full shadow-md transition-all flex items-center space-x-1.5 active:scale-95 ${
                onboardingSelectedCrop
                  ? "bg-[#2D5A27] hover:bg-[#23481f] text-white shadow-[#2D5A27]/30 cursor-pointer"
                  : "bg-[#E5E3DC] text-[#4A4947] cursor-not-allowed"
              }`}
            >
              <span>{lang === "te" ? "ప్రారంభించండి" : "Get Started"}</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFCF8] text-[#2A2928] flex flex-col items-center justify-between p-4 sm:p-6 pb-24 relative overflow-x-hidden select-none font-sans">
      {/* Hidden Audio Player */}
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Hidden Mobile Image Fallback Picker */}
      <input
        type="file"
        id="mobileCameraInput"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleImageDiagnosis(e.target.files[0]);
          }
        }}
      />

      {/* ========================================================================= */}
      {/* TOP APP BAR (Appears on Screens: ☰ Hamburger + App Name) */}
      {/* ========================================================================= */}
      <header className="w-full max-w-md flex items-center justify-between py-2 border-b border-[#E5E3DC] z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-2xl bg-white border border-[#E5E3DC] text-[#2D5A27] flex items-center justify-center text-xl shadow-xs hover:bg-[#EAF3E8] active:scale-95 transition-all"
            aria-label="Open Menu"
          >
            ☰
          </button>
          <div
            onClick={() => setCurrentScreen("home")}
            className="cursor-pointer active:scale-95 transition-all"
          >
            <h1 className="text-xl font-black text-[#2D5A27] tracking-tight flex items-center space-x-1.5">
              <span>🌾</span>
              <span>{lang === "te" ? "అగ్రి సహాయక్" : "AgriSahayak"}</span>
            </h1>
          </div>
        </div>

        {/* Action Controls: Mute Toggle & Language Selector */}
        <div className="flex items-center space-x-2">
          {/* Mute / Unmute Audio Toggle */}
          <button
            onClick={() => {
              if (autoSpeak && audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current.currentTime = 0;
              }
              setAutoSpeak(!autoSpeak);
            }}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold border transition-all active:scale-95 shadow-2xs ${
              autoSpeak
                ? "bg-[#EAF3E8] border-[#2D5A27]/30 text-[#2D5A27] hover:bg-[#d8ebd5]"
                : "bg-[#fef2f2] border-red-300 text-red-700 hover:bg-red-100"
            }`}
            title={autoSpeak ? (lang === "te" ? "ధ్వని ఆపు (Mute)" : "Mute Voice") : (lang === "te" ? "ధ్వని ప్రారంభించు (Unmute)" : "Unmute Voice")}
            aria-label="Toggle Voice Mute"
          >
            {autoSpeak ? "🔊" : "🔇"}
          </button>

          {/* Quick Language Toggle */}
          <div className="flex bg-[#F3F2EE] rounded-full p-0.5 border border-[#E5E3DC] text-xs font-bold shadow-2xs">
            <button
              onClick={() => setLang("te")}
              className={`px-2.5 py-1 rounded-full transition-all ${
                lang === "te" ? "bg-[#2D5A27] text-white shadow-xs" : "text-[#4A4947]"
              }`}
            >
              తెలుగు
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-full transition-all ${
                lang === "en" ? "bg-[#2D5A27] text-white shadow-xs" : "text-[#4A4947]"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* SCREEN 1: START / HOME (Hand-Drawn Screen 1) */}
      {/* ========================================================================= */}
      {currentScreen === "home" && (
        <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center space-y-6 my-auto py-6 animate-in fade-in duration-150">
          {/* 1. Large Circular Camera Button with Brand Forest Green */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setCurrentScreen("camera")}
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#23481f] via-[#2D5A27] to-[#3a7332] text-white shadow-2xl hover:shadow-[#2D5A27]/40 active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-white ring-4 ring-[#2D5A27]/30 group"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform">📷</span>
            </button>
            <span className="text-sm font-extrabold text-[#2D5A27] mt-3 tracking-wide">
              {lang === "te" ? "పంటను స్కాన్ చేయండి" : "Scan My Crop"}
            </span>
          </div>

          {/* 2. Visual Tutorial Card: Plant -> Phone Scan -> Remedy */}
          <div
            onClick={() => setCurrentScreen("camera")}
            className="w-full bg-white border-2 border-dashed border-[#E5E3DC] hover:border-[#2D5A27] rounded-3xl p-4 shadow-sm active:scale-[0.99] transition-all cursor-pointer group"
          >
            <span className="text-[11px] font-extrabold text-[#D97706] uppercase tracking-wider block mb-2 text-center">
              💡 {lang === "te" ? "సులభమైన 3 దశలు" : "How it works"}
            </span>
            <div className="flex items-center justify-between text-center px-1">
              {/* Step 1: Sick Plant */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-2xl p-1.5 bg-[#fef3c7] rounded-2xl border border-[#D97706]/30">🪴</span>
                <span className="text-[10px] font-bold text-[#4A4947] mt-1 leading-tight">
                  {lang === "te" ? "1. వ్యాధి ఆకు" : "1. Sick Plant"}
                </span>
              </div>

              <span className="text-[#D97706] font-black text-sm px-1">➔</span>

              {/* Step 2: Phone Camera Scan */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-2xl p-1.5 bg-[#EAF3E8] rounded-2xl border border-[#2D5A27]/30 group-hover:scale-105 transition-transform">📱</span>
                <span className="text-[10px] font-bold text-[#4A4947] mt-1 leading-tight">
                  {lang === "te" ? "2. ఫోటో తీయి" : "2. Phone Scan"}
                </span>
              </div>

              <span className="text-[#2D5A27] font-black text-sm px-1">➔</span>

              {/* Step 3: Remedy Solution */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-2xl p-1.5 bg-[#EAF3E8] rounded-2xl border border-[#2D5A27]/30">🌿</span>
                <span className="text-[10px] font-bold text-[#4A4947] mt-1 leading-tight">
                  {lang === "te" ? "3. నివారణ మందు" : "3. Get Cure (+)"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: CHAT / CONVERSATION FEED (Hand-Drawn Screen 2) */}
      {/* ========================================================================= */}
      {currentScreen === "ask" && (
        <div className="w-full max-w-md flex-1 flex flex-col space-y-3 pb-6 animate-in fade-in duration-150 overflow-y-auto">
          {/* Header Bar inside Chat */}
          <div className="flex items-center justify-between bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-emerald-100 shadow-2xs">
            <button
              onClick={() => setCurrentScreen("home")}
              className="text-xs font-bold text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200/80 px-3 py-1 rounded-full flex items-center space-x-1"
            >
              <span>⬅️</span>
              <span>{lang === "te" ? "హోమ్" : "Back"}</span>
            </button>
            <span className="text-xs font-extrabold text-emerald-950">
              {lang === "te" ? "రైతు సంభాషణ" : "Farming Assistant"}
            </span>
          </div>

          {/* Conversation Feed */}
          <div className="space-y-3 flex-1">
            {loading && (
              <div className="bg-white border border-emerald-200 rounded-2xl p-3 shadow-xs flex items-center space-x-2.5 animate-pulse">
                <div className="w-5 h-5 bg-emerald-600 rounded-full animate-bounce"></div>
                <span className="text-xs font-bold text-emerald-900">
                  {lang === "te" ? "సలహా విశ్లేషిస్తున్నాము..." : "Thinking & analyzing crop advice..."}
                </span>
              </div>
            )}

            {messages.length === 0 && !loading && (
              <div className="bg-white/60 border border-emerald-100 rounded-3xl p-6 text-center space-y-2 text-zinc-500 my-auto">
                <span className="text-4xl block">🌾</span>
                <span className="text-xs font-bold block text-emerald-950">
                  {lang === "te" ? "మీ ప్రశ్నను అడగండి లేదా ఆకును స్కాన్ చేయండి" : "Ask a farming question or scan a crop leaf"}
                </span>
                <p className="text-[11px] text-zinc-500">
                  {lang === "te" ? "వాయిస్ మైక్ నొక్కి మాట్లాడండి లేదా కింద ఉన్న కెమెరా బటన్ వాడండి." : "Use the mic to speak in Telugu or tap the camera icon below."}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {msg.sender === "user" ? (
                  <div className="bg-emerald-800 text-white rounded-2xl rounded-tr-none px-3.5 py-2 max-w-[85%] text-xs shadow-xs">
                    <p>{msg.text}</p>
                    <span className="text-[9px] text-emerald-200 block text-right mt-0.5">{msg.timestamp}</span>
                  </div>
                ) : (
                  <div className="w-full bg-white border border-emerald-100 rounded-2xl rounded-tl-none p-3.5 shadow-xs space-y-2">
                    {/* Action Header (Only for recognizable crop diagnosis or standard assistant replies) */}
                    {msg.actionName && (!msg.diagnosisData || (!msg.diagnosisData.pathogen?.includes("threshold") && !msg.diagnosisData.pathogen?.includes("not contain") && !msg.diagnosisData.diseaseName.includes("ఆకు చిత్రం కాదు") && !msg.diagnosisData.diseaseName.includes("Not a Plant") && !msg.diagnosisData.diseaseName.includes("Not a Recognizable") && !msg.diagnosisData.severity?.includes("Invalid"))) && (
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                        <span className="bg-emerald-100 text-emerald-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                          🎯 {msg.actionName}
                        </span>
                        {/* % Match only shown for scan queries */}
                        {msg.diagnosisData && msg.confidence && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            ✨ {msg.confidence}% Match
                          </span>
                        )}
                      </div>
                    )}

                    {/* PROGRESSIVE DISCLOSURE: DISEASE DIAGNOSIS CARD */}
                    {msg.diagnosisData ? (
                      <div className="space-y-2.5">
                        {/* 1. NON-PLANT / LOW CONFIDENCE WARNING */}
                        {msg.diagnosisData.pathogen?.includes("threshold") || msg.diagnosisData.pathogen?.includes("not contain") || msg.diagnosisData.diseaseName.includes("ఆకు చిత్రం కాదు") || msg.diagnosisData.diseaseName.includes("Not a Plant") || msg.diagnosisData.severity?.includes("Invalid") ? (
                          <div className="bg-[#fef3c7]/90 border border-[#D97706]/40 rounded-2xl p-3.5 space-y-2 text-[#2A2928]">
                            <div className="flex items-center space-x-2">
                              <span className="text-xl">⚠️</span>
                              <span className="font-extrabold text-xs text-[#D97706]">
                                {lang === "te" ? "పంట ఆకు గుర్తించబడలేదు" : "No Crop Leaf Detected"}
                              </span>
                            </div>
                            <p className="text-xs text-[#4A4947] leading-relaxed">
                              {msg.text}
                            </p>
                            <div className="pt-1">
                              <button
                                onClick={() => setCurrentScreen("camera")}
                                className="bg-[#2D5A27] hover:bg-[#23481f] text-white text-xs font-bold px-4 py-2 rounded-full shadow-xs flex items-center space-x-1.5 active:scale-95 transition-all"
                              >
                                <span>📷</span>
                                <span>{lang === "te" ? "మళ్లీ స్కాన్ చేయండి" : "Scan Again with Camera"}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Escalation Helpline Warning (Always Visible if low confidence) */}
                            {msg.diagnosisData.reasoning?.is_escalated && (
                              <div className="bg-red-50 border-2 border-red-500 rounded-xl p-2.5 text-red-950 flex items-center justify-between">
                                <div>
                                  <span className="font-extrabold text-xs block">
                                    ⚠️ {lang === "te" ? "స్పష్టత లేని స్కాన్" : "Inconclusive Scan"}
                                  </span>
                                  <span className="text-[10px] text-red-800 block">
                                    {msg.diagnosisData.reasoning.escalation_reason}
                                  </span>
                                </div>
                                <a
                                  href="tel:18001801551"
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
                                >
                                  📞 {lang === "te" ? "కాల్ చేయండి" : "Call KCC"}
                                </a>
                              </div>
                            )}

                            {/* Urgency Badge */}
                            {msg.diagnosisData.reasoning && (
                              <div
                                className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold ${
                                  msg.diagnosisData.reasoning.urgency_level === "CRITICAL"
                                    ? "bg-red-50 border-red-300 text-red-900"
                                    : msg.diagnosisData.reasoning.urgency_level === "MODERATE"
                                    ? "bg-amber-50 border-amber-300 text-amber-900"
                                    : "bg-emerald-50 border-emerald-300 text-emerald-900"
                                }`}
                              >
                                <span>🚨 {msg.diagnosisData.reasoning.urgency_label}</span>
                                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full shadow-2xs">
                                  {msg.diagnosisData.reasoning.urgency_level}
                                </span>
                              </div>
                            )}

                            {/* Headline Advice: Single Tier-1 Recommended Action */}
                            <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3">
                              <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1">
                                <span>🌿</span>
                                <span>{lang === "te" ? "సేంద్రీయ నివారణ (సిఫార్సు):" : "Recommended Remedy (Organic):"}</span>
                              </span>
                              <p className="text-xs text-emerald-900 font-semibold mt-1">
                                {msg.diagnosisData.reasoning?.tier_1_organic?.name || msg.diagnosisData.organicCure}
                              </p>
                              {msg.diagnosisData.reasoning?.tier_1_organic?.dosage && (
                                <p className="text-[11px] text-zinc-600 mt-0.5">
                                  📌 <b>{lang === "te" ? "మోతాదు" : "Dosage"}:</b> {msg.diagnosisData.reasoning.tier_1_organic.dosage}
                                </p>
                              )}
                            </div>

                            {/* Progressive Disclosure Toggle */}
                            <button
                              onClick={() => toggleDetails(msg.id)}
                              className="w-full text-center text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50/50 hover:bg-emerald-100/60 py-2 rounded-xl border border-emerald-200/60 transition-colors flex items-center justify-center space-x-1"
                            >
                              <span>{expandedDetails[msg.id] ? "▲" : "▼"}</span>
                              <span>
                                {expandedDetails[msg.id]
                                  ? lang === "te" ? "వివరాలను దాచండి (Hide Details)" : "Hide Details"
                                  : lang === "te" ? "మరిన్ని వివరాలు చూడండి (See Details)" : "See Details (Chemical, Costs, Stats)"}
                              </span>
                            </button>
                          </>
                        )}

                        {/* Collapsed Detailed Section */}
                        {expandedDetails[msg.id] && (
                          <div className="space-y-2.5 pt-1 border-t border-emerald-100 animate-in fade-in duration-150">
                            {/* Damage / Vigor Stats */}
                            <div className="grid grid-cols-3 gap-1.5 text-center text-xs bg-zinc-50 p-2 rounded-xl border border-zinc-200">
                              <div>
                                <span className="text-[10px] text-zinc-500 block">{lang === "te" ? "తీవ్రత" : "Severity"}</span>
                                <span className="font-bold text-zinc-900">{msg.diagnosisData.severity}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">{lang === "te" ? "దెబ్బతిన్నది" : "Damage"}</span>
                                <span className="font-bold text-zinc-900">{msg.diagnosisData.affectedAreaPct}%</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">{lang === "te" ? "పచ్చదనం" : "Vigor"}</span>
                                <span className="font-bold text-zinc-900">{msg.diagnosisData.chlorophyllVigorPct}%</span>
                              </div>
                            </div>

                            {/* Tier 2 & Tier 3 Chemical Alternatives */}
                            {msg.diagnosisData.reasoning && (
                              <div className="space-y-2">
                                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-amber-950">
                                      🧪 {lang === "te" ? "టైర్ 2: సంప్రదాయ రసాయన మందు" : "Tier 2: Contact Protectant"}
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                                      💰 {msg.diagnosisData.reasoning.tier_2_moderate.cost_inr}
                                    </span>
                                  </div>
                                  <p className="text-xs text-amber-950 mt-1">{msg.diagnosisData.reasoning.tier_2_moderate.name}</p>
                                  <p className="text-[10px] text-zinc-600">📌 {msg.diagnosisData.reasoning.tier_2_moderate.dosage}</p>
                                </div>

                                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-zinc-900">
                                      🔬 {lang === "te" ? "టైర్ 3: సిస్టమిక్ మందు (అత్యవసరం)" : "Tier 3: Systemic Curative"}
                                    </span>
                                    <span className="text-[10px] font-bold text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded-full">
                                      💰 {msg.diagnosisData.reasoning.tier_3_systemic.cost_inr}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-900 mt-1">{msg.diagnosisData.reasoning.tier_3_systemic.name}</p>
                                  <p className="text-[10px] text-zinc-600">📌 {msg.diagnosisData.reasoning.tier_3_systemic.dosage}</p>
                                </div>
                              </div>
                            )}

                            {/* Pathogen & Clinical Symptoms */}
                            <p className="text-[11px] text-zinc-600 bg-white p-2 rounded-xl border border-zinc-200">
                              ℹ️ <b>{lang === "te" ? "వ్యాధి లక్షణాలు" : "Symptoms"}:</b> {msg.diagnosisData.pathogen}
                            </p>
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
                        <div className="grid grid-cols-4 gap-1.5 bg-[#F3F2EE] p-2.5 rounded-2xl border border-[#E5E3DC] text-center">
                          <div className="bg-white p-1.5 rounded-xl border border-[#E5E3DC]">
                            <span className="text-[10px] text-[#4A4947] block">🌡️ {lang === "te" ? "ఉష్ణోగ్రత" : "Temp"}</span>
                            <span className="text-xs font-extrabold text-[#2A2928]">{msg.weatherData.temperature}°C</span>
                          </div>
                          <div className="bg-white p-1.5 rounded-xl border border-[#E5E3DC]">
                            <span className="text-[10px] text-[#4A4947] block">💧 {lang === "te" ? "తేమ" : "Humidity"}</span>
                            <span className="text-xs font-extrabold text-[#2A2928]">{msg.weatherData.humidity}%</span>
                          </div>
                          <div className="bg-white p-1.5 rounded-xl border border-[#E5E3DC]">
                            <span className="text-[10px] text-[#4A4947] block">💨 {lang === "te" ? "గాలి" : "Wind"}</span>
                            <span className="text-xs font-extrabold text-[#2A2928]">{msg.weatherData.wind_speed} <span className="text-[9px]">km/h</span></span>
                          </div>
                          <div className="bg-white p-1.5 rounded-xl border border-[#E5E3DC]">
                            <span className="text-[10px] text-[#4A4947] block">🌧️ {lang === "te" ? "వర్షం" : "Rain"}</span>
                            <span className="text-xs font-extrabold text-[#2A2928]">{msg.weatherData.rain_prob_6h}%</span>
                          </div>
                        </div>

                        {/* Safe Spray Window Box */}
                        <div className="bg-[#EAF3E8] border-l-4 border-[#2D5A27] p-3 rounded-r-2xl shadow-xs">
                          <span className="text-xs font-bold text-[#2D5A27] flex items-center space-x-1">
                            <span>⏰</span>
                            <span>{lang === "te" ? "పిచికారీకి అనుకూల సమయం (Best Window):" : "Recommended Spray Window:"}</span>
                          </span>
                          <p className="text-xs text-[#2A2928] mt-1 font-semibold">{msg.weatherData.safe_window}</p>
                        </div>
                      </div>
                    ) : msg.irrigationData ? (
                      /* Irrigation Verdict Card */
                      <div className="space-y-2">
                        <div className="bg-[#F3F2EE] border border-[#E5E3DC] rounded-xl p-3">
                          <span className="text-xs font-extrabold text-[#2D5A27] block">
                            💧 {msg.irrigationData.recommendation}
                          </span>
                          <p className="text-xs text-[#4A4947] mt-1">{msg.irrigationData.reason}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="bg-white p-1.5 rounded-lg border border-[#E5E3DC]">
                              <span className="text-[10px] text-[#4A4947] block">{lang === "te" ? "వర్షపాతం" : "Rainfall"}</span>
                              <span className="font-bold text-[#2A2928]">{msg.irrigationData.rainfall_expected_mm} mm</span>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg border border-[#E5E3DC]">
                              <span className="text-[10px] text-[#4A4947] block">{lang === "te" ? "తదుపరి సమీక్ష" : "Next Check"}</span>
                              <span className="font-bold text-[#2A2928]">{msg.irrigationData.next_check_date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : msg.soilData ? (
                      /* SOIL HEALTH CARD INTERPRETATION */
                      <div className="space-y-3">
                        {/* Overall Summary Notice */}
                        <div className="bg-[#EAF3E8] border border-[#2D5A27]/30 rounded-2xl p-3 space-y-1">
                          <span className="text-xs font-extrabold text-[#2D5A27] flex items-center space-x-1">
                            <span>🧪</span>
                            <span>{lang === "te" ? "నేల పోషకాల విశ్లేషణ (Soil Summary):" : "Soil Health Assessment:"}</span>
                          </span>
                          <p className="text-xs text-[#2A2928] font-semibold leading-relaxed">
                            {msg.soilData.overall_summary}
                          </p>
                        </div>

                        {/* Crop Suitability Fit (if crop was specified) */}
                        {msg.soilData.crop_fit && (
                          <div
                            className={`p-3 rounded-2xl border flex flex-col space-y-1 text-xs ${
                              msg.soilData.crop_fit.is_well_suited
                                ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                                : "bg-amber-50/90 border-amber-300 text-amber-950"
                            }`}
                          >
                            <div className="flex items-center justify-between font-extrabold">
                              <span>🌾 {lang === "te" ? "పంట అనుకూలత:" : "Crop Suitability:"}</span>
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full shadow-2xs border">
                                {msg.soilData.crop_fit.badge}
                              </span>
                            </div>
                            <p className="text-xs font-medium">{msg.soilData.crop_fit.verdict}</p>
                          </div>
                        )}

                        {/* 4-Grid Nutrient Classification (N, P, K, pH) */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Nitrogen */}
                          <div className="bg-white border border-[#E5E3DC] rounded-xl p-2.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#2A2928]">🌱 {lang === "te" ? "నత్రజని (N)" : "Nitrogen (N)"}</span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  msg.soilData.nitrogen.band_key === "low"
                                    ? "bg-red-100 text-red-800"
                                    : msg.soilData.nitrogen.band_key === "high"
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-emerald-100 text-emerald-900"
                                }`}
                              >
                                {msg.soilData.nitrogen.status}
                              </span>
                            </div>
                            <span className="text-[11px] font-black text-[#2D5A27] block">
                              {msg.soilData.nitrogen.value} kg/ha
                            </span>
                            <p className="text-[10px] text-[#4A4947] leading-tight">
                              📌 {msg.soilData.nitrogen.advice}
                            </p>
                          </div>

                          {/* Phosphorus */}
                          <div className="bg-white border border-[#E5E3DC] rounded-xl p-2.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#2A2928]">🌾 {lang === "te" ? "భాస్వరం (P)" : "Phosphorus (P)"}</span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  msg.soilData.phosphorus.band_key === "low"
                                    ? "bg-red-100 text-red-800"
                                    : msg.soilData.phosphorus.band_key === "high"
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-emerald-100 text-emerald-900"
                                }`}
                              >
                                {msg.soilData.phosphorus.status}
                              </span>
                            </div>
                            <span className="text-[11px] font-black text-[#2D5A27] block">
                              {msg.soilData.phosphorus.value} kg/ha
                            </span>
                            <p className="text-[10px] text-[#4A4947] leading-tight">
                              📌 {msg.soilData.phosphorus.advice}
                            </p>
                          </div>

                          {/* Potassium */}
                          <div className="bg-white border border-[#E5E3DC] rounded-xl p-2.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#2A2928]">🍃 {lang === "te" ? "పొటాష్ (K)" : "Potassium (K)"}</span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  msg.soilData.potassium.band_key === "low"
                                    ? "bg-red-100 text-red-800"
                                    : msg.soilData.potassium.band_key === "high"
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-emerald-100 text-emerald-900"
                                }`}
                              >
                                {msg.soilData.potassium.status}
                              </span>
                            </div>
                            <span className="text-[11px] font-black text-[#2D5A27] block">
                              {msg.soilData.potassium.value} kg/ha
                            </span>
                            <p className="text-[10px] text-[#4A4947] leading-tight">
                              📌 {msg.soilData.potassium.advice}
                            </p>
                          </div>

                          {/* pH */}
                          <div className="bg-white border border-[#E5E3DC] rounded-xl p-2.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#2A2928]">⚖️ {lang === "te" ? "నేల pH" : "Soil pH"}</span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  msg.soilData.ph.band_key === "acidic"
                                    ? "bg-amber-100 text-amber-900"
                                    : msg.soilData.ph.band_key === "alkaline"
                                    ? "bg-purple-100 text-purple-900"
                                    : "bg-emerald-100 text-emerald-900"
                                }`}
                              >
                                {msg.soilData.ph.status}
                              </span>
                            </div>
                            <span className="text-[11px] font-black text-[#2D5A27] block">
                              pH {msg.soilData.ph.value}
                            </span>
                            <p className="text-[10px] text-[#4A4947] leading-tight">
                              📌 {msg.soilData.ph.advice}
                            </p>
                          </div>
                        </div>

                        {/* Explicit Disclaimer (Entered values, not photo scan) */}
                        <div className="bg-[#F3F2EE] border border-[#E5E3DC] rounded-xl p-2 text-[10px] text-[#4A4947] flex items-start space-x-1.5">
                          <span>📋</span>
                          <span>{msg.soilData.disclaimer}</span>
                        </div>
                      </div>
                    ) : (
                      /* General Text Reply */
                      <p className="text-xs text-[#2A2928] leading-relaxed font-normal">
                        {msg.text}
                      </p>
                    )}

                    {/* Audio Listen Button */}
                    {msg.audioB64 && (
                      <div className="pt-2 border-t border-[#E5E3DC] flex items-center justify-between">
                        <button
                          onClick={() => {
                            if (audioPlayerRef.current && msg.audioB64) {
                              audioPlayerRef.current.src = msg.audioB64;
                              audioPlayerRef.current.play();
                            }
                          }}
                          className="bg-[#EAF3E8] hover:bg-[#d8ebd5] text-[#2D5A27] border border-[#2D5A27]/30 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1"
                        >
                          <span>🔊</span>
                          <span>{lang === "te" ? "వినండి" : "Listen"}</span>
                        </button>
                        <span className="text-[10px] text-[#4A4947]">{msg.timestamp}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CAMERA VIEWFINDER MODAL */}
      {/* ========================================================================= */}
      {currentScreen === "camera" && (
        <div className="w-full max-w-md flex-1 flex flex-col space-y-3 animate-in fade-in duration-150 my-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#2D5A27]">
              📷 {lang === "te" ? "ఆకును కెమెరాలో చూపించండి" : "Point Camera at Leaf"}
            </span>
            <button
              onClick={() => setCurrentScreen("home")}
              className="text-xs font-bold text-[#4A4947] hover:text-[#2A2928] bg-[#F3F2EE] px-3 py-1 rounded-full border border-[#E5E3DC]"
            >
              ✕ {lang === "te" ? "రద్దు చేయి" : "Cancel"}
            </button>
          </div>

          <div className="relative h-80 bg-zinc-950 rounded-3xl overflow-hidden shadow-xl border-2 border-[#2D5A27] flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Alignment Reticle Target */}
            <div className="absolute border-2 border-dashed border-[#2D5A27] w-56 h-56 rounded-3xl pointer-events-none flex items-center justify-center bg-[#2D5A27]/10">
              <span className="bg-black/70 text-[#EAF3E8] text-[11px] font-semibold px-3 py-1 rounded-full">
                {lang === "te" ? "ఆకును ఇక్కడ అమర్చండి" : "Fit leaf in box"}
              </span>
            </div>
          </div>

          {/* Capture Controls */}
          <div className="flex space-x-2 pt-1">
            <button
              onClick={captureCameraFrame}
              className="flex-1 bg-[#2D5A27] hover:bg-[#23481f] active:scale-95 text-white font-black py-4 px-4 rounded-2xl shadow-lg transition-transform text-sm flex items-center justify-center space-x-2"
            >
              <span className="text-xl">📸</span>
              <span>{lang === "te" ? "ఫోటో తీయి & స్కాన్ చేయి" : "Take Photo & Scan"}</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#F3F2EE] hover:bg-[#E5E3DC] active:scale-95 text-[#2A2928] font-bold px-4 rounded-2xl text-xs flex items-center justify-center space-x-1 border border-[#E5E3DC]"
            >
              <span>📁</span>
              <span>{lang === "te" ? "గ్యాలరీ" : "Upload"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PERSISTENT BOTTOM DOCK (Screens 1 & 2): Mic + Text Input + Camera Button */}
      {/* ========================================================================= */}
      {currentScreen !== "camera" && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#FDFCF8]/95 backdrop-blur-md border-t border-[#E5E3DC] p-3 flex justify-center shadow-lg z-40">
          <div className="w-full max-w-md flex items-center space-x-2">
            {/* 1. Large Mic Orb */}
            <button
              type="button"
              onClick={toggleListening}
              className={`w-12 h-12 rounded-full text-white active:scale-90 transition-all flex items-center justify-center text-xl shadow-md shrink-0 ${
                isListening ? "bg-red-600 animate-pulse ring-4 ring-red-300" : "bg-[#2D5A27] hover:bg-[#23481f]"
              }`}
              title="Speak Query"
            >
              🎙️
            </button>

            {/* 2. Text Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex-1 flex items-center relative"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  lang === "te"
                    ? "ప్రశ్న అడగండి..."
                    : "Ask question..."
                }
                className="w-full bg-[#F3F2EE] border border-[#E5E3DC] focus:border-[#2D5A27] rounded-full pl-3.5 pr-8 py-2.5 text-xs outline-none text-[#2A2928] font-medium"
              />
              <button
                type="submit"
                className="absolute right-1.5 text-[#2D5A27] hover:text-[#23481f] font-bold text-xs p-1"
              >
                ➔
              </button>
            </form>

            {/* 3. Camera Shortcut Button (on Screen 2 & available on Screen 1) */}
            <button
              type="button"
              onClick={() => setCurrentScreen("camera")}
              className="w-10 h-10 rounded-full bg-[#EAF3E8] hover:bg-[#d8ebd5] text-[#2D5A27] border border-[#2D5A27]/30 flex items-center justify-center text-lg active:scale-95 transition-all shrink-0"
              title="Open Camera"
            >
              📷
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: SIDE DRAWER / FARM DASHBOARD (Hand-Drawn Screen 3 via ☰) */}
      {/* ========================================================================= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Body */}
          <div className="relative bg-[#FDFCF8] w-5/6 max-w-sm h-full shadow-2xl p-5 flex flex-col space-y-4 overflow-y-auto animate-in slide-in-from-left duration-200 z-10 border-r border-[#E5E3DC]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🌾</span>
                <span className="font-extrabold text-base text-[#2D5A27]">
                  {lang === "te" ? "నా వ్యవసాయ డ్యాష్‌బోర్డ్" : "Farm Dashboard"}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F3F2EE] hover:bg-[#E5E3DC] text-[#4A4947] font-bold text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* 1. HORIZONTALLY SCROLLABLE SELECTED CROPS STRIP */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#4A4947] uppercase tracking-wider">
                  🌱 {lang === "te" ? "ఎంచుకున్న పంటలు (Selected Crops):" : "Selected Crops:"}
                </span>
                <span className="text-[10px] text-[#4A4947]/70">
                  {lang === "te" ? "స్క్రోల్ చేయండి ➔" : "Scroll ➔"}
                </span>
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto py-1 pr-2 no-scrollbar">
                {/* 1-Tap Add Crop Button */}
                <button
                  onClick={() => {
                    setAddCropModalOpen(true);
                  }}
                  className="px-3 py-2 bg-[#2D5A27] hover:bg-[#23481f] text-white rounded-2xl text-xs font-bold flex items-center space-x-1 shrink-0 shadow-xs active:scale-95 transition-all"
                >
                  <span>➕</span>
                  <span>{lang === "te" ? "పంటను మార్చు" : "Change Crop"}</span>
                </button>

                {/* Saved Crop Chips */}
                {savedCrops.map((crop) => {
                  const cropIcons: Record<string, string> = {
                    tomato: "🍅", rice: "🌾", chilli: "🌶️", cotton: "🌿",
                    groundnut: "🥜", maize: "🌽", sugarcane: "🎋", wheat: "🌾",
                  };
                  const cropNames: Record<string, { en: string; te: string }> = {
                    tomato: { en: "Tomato", te: "టమాటా" },
                    rice: { en: "Rice", te: "వరి" },
                    chilli: { en: "Chilli", te: "మిరప" },
                    cotton: { en: "Cotton", te: "పత్తి" },
                    groundnut: { en: "Groundnut", te: "వేరుశనగ" },
                    maize: { en: "Maize", te: "మొక్కజొన్న" },
                    sugancane: { en: "Sugarcane", te: "చెరకు" },
                    wheat: { en: "Wheat", te: "గోధుమ" },
                  };
                  const icon = cropIcons[crop.crop_type.toLowerCase()] || "🌱";
                  const name = cropNames[crop.crop_type.toLowerCase()] || { en: crop.crop_type, te: crop.crop_type };

                  return (
                    <div key={crop.id} className="flex items-center space-x-1.5 shrink-0">
                      <div className="px-3 py-2 bg-[#EAF3E8] border border-[#2D5A27]/20 rounded-2xl flex items-center space-x-1.5 shrink-0 shadow-2xs">
                        <span className="text-base">{icon}</span>
                        <span className="text-xs font-bold text-[#2D5A27]">{lang === "te" ? name.te : name.en}</span>
                        <button
                          onClick={() => handleDeleteCrop(crop.id)}
                          className="text-[10px] text-[#4A4947] hover:text-red-600 pl-1 font-bold"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Soil Health Button beside selected crop */}
                      <button
                        onClick={() => {
                          setSoilTargetCrop(crop.crop_type);
                          setSoilHealthModalOpen(true);
                        }}
                        className="px-2.5 py-2 bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] border border-[#f59e0b]/30 rounded-2xl text-xs font-bold flex items-center space-x-1 shrink-0 shadow-2xs active:scale-95 transition-all"
                        title={lang === "te" ? "నేల ఆరోగ్య కార్డు వివరాలు" : "Soil Health Card"}
                      >
                        <span>🧪</span>
                        <span>{lang === "te" ? "నేల ఆరోగ్యం" : "Soil Health"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. LANGUAGE & VOICE AUDIO TOGGLE */}
            <div className="bg-[#F3F2EE] border border-[#E5E3DC] rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#4A4947]">
                  🌐 {lang === "te" ? "భాష మార్చండి (Language):" : "App Language:"}
                </span>
                {/* Voice sound toggle */}
                <button
                  onClick={() => {
                    if (autoSpeak && audioPlayerRef.current) {
                      audioPlayerRef.current.pause();
                      audioPlayerRef.current.currentTime = 0;
                    }
                    setAutoSpeak(!autoSpeak);
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 border transition-all ${
                    autoSpeak
                      ? "bg-[#EAF3E8] border-[#2D5A27]/30 text-[#2D5A27]"
                      : "bg-[#fef2f2] border-red-300 text-red-700"
                  }`}
                >
                  <span>{autoSpeak ? "🔊" : "🔇"}</span>
                  <span>{autoSpeak ? (lang === "te" ? "ధ్వని ఆన్" : "Voice On") : (lang === "te" ? "ధ్వని మ్యూట్" : "Muted")}</span>
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setLang("te")}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    lang === "te" ? "bg-[#2D5A27] text-white shadow-xs" : "bg-white text-[#4A4947] border border-[#E5E3DC]"
                  }`}
                >
                  తెలుగు (Telugu)
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    lang === "en" ? "bg-[#2D5A27] text-white shadow-xs" : "bg-white text-[#4A4947] border border-[#E5E3DC]"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* 3. WEATHER CARD */}
            <div className="bg-white border border-[#E5E3DC] rounded-2xl p-3.5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#2A2928] flex items-center space-x-1">
                  <span>🌦️</span>
                  <span>{lang === "te" ? "వాతావరణం & పిచికారీ సలహా" : "Weather & Spray Advisory"}</span>
                </span>
                {liveWeather && (
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      liveWeather.spray_status === "UNSAFE"
                        ? "bg-red-100 text-red-800"
                        : liveWeather.spray_status === "CAUTION"
                        ? "bg-[#fef3c7] text-[#D97706]"
                        : "bg-[#EAF3E8] text-[#2D5A27]"
                    }`}
                  >
                    {liveWeather.spray_status}
                  </span>
                )}
              </div>

              {liveWeather ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="bg-blue-50/70 p-1.5 rounded-xl">
                      <span className="text-[9px] text-zinc-500 block">💨 {lang === "te" ? "గాలి" : "Wind"}</span>
                      <span className="text-xs font-extrabold text-blue-950">{liveWeather.wind_speed} <span className="text-[8px]">km/h</span></span>
                    </div>
                    <div className="bg-blue-50/70 p-1.5 rounded-xl">
                      <span className="text-[9px] text-zinc-500 block">🌧️ {lang === "te" ? "వర్షం" : "Rain"}</span>
                      <span className="text-xs font-extrabold text-blue-950">{liveWeather.rain_prob_6h}%</span>
                    </div>
                  </div>

                  <div className="p-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 text-[11px]">
                    <span className="font-bold text-emerald-950 block">
                      ⏰ {lang === "te" ? "అనుకూల పిచికారీ సమయం:" : "Recommended Window:"} {liveWeather.safe_window}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setIrrigationModalOpen(true);
                    }}
                    className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1"
                  >
                    <span>💧</span>
                    <span>{lang === "te" ? "నీటిపారుదల సలహాదారు" : "Irrigation Calculator"}</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-zinc-400 text-center py-2 animate-pulse">
                  {lang === "te" ? "వాతావరణం లోడ్ అవుతోంది..." : "Loading live weather..."}
                </div>
              )}
            </div>

            {/* 4. ALERTS / STAGE RISKS CARD (Screen 3 Drawer) */}
            <div className="bg-white border border-amber-300 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-950 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{lang === "te" ? "తెగుళ్ల హెచ్చరికలు (Alerts)" : "Pest & Disease Alerts"}</span>
                </span>
                {savedCrops.length > 0 && (
                  <button
                    onClick={() => {
                      setStageModalTargetCrop(savedCrops[0]);
                    }}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-full"
                  >
                    🌱 {lang === "te" ? "దశ మార్చు ▾" : "Change Stage ▾"}
                  </button>
                )}
              </div>

              {savedCrops.length === 0 ? (
                <p className="text-[11px] text-zinc-500 text-center py-2 bg-amber-50/50 rounded-xl border border-amber-100">
                  {lang === "te" ? "హెచ్చరికల కోసం పైన పంటను ఎంచుకోండి." : "Select a crop above to see stage precautions."}
                </p>
              ) : (
                <div className="space-y-2">
                  {savedCrops.map((crop) => {
                    const cropNames: Record<string, { en: string; te: string }> = {
                      tomato: { en: "Tomato", te: "టమాటా" },
                      rice: { en: "Rice", te: "వరి" },
                      chilli: { en: "Chilli", te: "మిరప" },
                      cotton: { en: "Cotton", te: "పత్తి" },
                      groundnut: { en: "Groundnut", te: "వేరుశనగ" },
                      maize: { en: "Maize", te: "మొక్కజొన్న" },
                      sugarcane: { en: "Sugarcane", te: "చెరకు" },
                      wheat: { en: "Wheat", te: "గోధుమ" },
                    };
                    const stageNames: Record<string, { en: string; te: string }> = {
                      "Just planted": { en: "Just planted", te: "విత్తనం వేశారు" },
                      "Growing (leaves & stem)": { en: "Growing", te: "ఎదుగుదల దశ" },
                      "Flowering": { en: "Flowering", te: "పూత దశ" },
                      "Fruit/grain forming": { en: "Fruit forming", te: "కాయ / గింజ కట్టే దశ" },
                      "Almost ready to harvest": { en: "Harvest ready", te: "కోతకు సిద్ధం" },
                    };
                    const cropName = cropNames[crop.crop_type.toLowerCase()]?.[lang] || crop.crop_type;
                    const stageName = stageNames[crop.last_alert?.stage || "Growing (leaves & stem)"]?.[lang] || crop.last_alert?.stage || (lang === "te" ? "ఎదుగుదల దశ" : "Growing");

                    return (
                      <div key={crop.id} className="space-y-2">
                        <div className="flex justify-between items-center bg-amber-50/70 p-2 rounded-xl border border-amber-200">
                          <span className="font-extrabold text-xs text-amber-950 capitalize">
                            🌱 {cropName} ({stageName})
                          </span>
                          <span className="text-[10px] text-zinc-500">{crop.last_alert?.updated_at}</span>
                        </div>

                        {crop.last_alert && crop.last_alert.risks.length > 0 ? (
                          <div className="space-y-1.5">
                            {crop.last_alert.risks.map((r, idx) => (
                              <div key={idx} className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-200 text-xs space-y-1">
                                <span className="font-bold text-red-700 block">🚨 {r.risk_name}</span>
                                <p className="text-[11px] text-zinc-600">🔍 {r.what_to_look_for}</p>
                                <p className="text-[11px] text-emerald-900 font-semibold">🛡️ {r.action}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200 text-center">
                            <span className="text-[11px] text-zinc-500 block">
                              {stageLoadingId === crop.id
                                ? (lang === "te" ? "హెచ్చరికలు లోడ్ అవుతున్నాయి..." : "Loading alerts...")
                                : (lang === "te" ? "ఈ పంటకు హెచ్చరికలు సిద్ధంగా ఉన్నాయి." : "Precautions ready for this crop.")}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1-TAP ADD CROP MODAL */}
      {/* ========================================================================= */}
      {addCropModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-emerald-200">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <span className="text-sm font-extrabold text-emerald-950">
                {lang === "te" ? "పంటను ఎంచుకోండి" : "Select a Crop to Add"}
              </span>
              <button onClick={() => setAddCropModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 font-bold text-sm">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {[
                { id: "tomato", icon: "🍅", name_en: "Tomato", name_te: "టమాటా" },
                { id: "rice", icon: "🌾", name_en: "Rice", name_te: "వరి" },
                { id: "chilli", icon: "🌶️", name_en: "Chilli", name_te: "మిరప" },
                { id: "cotton", icon: "🌿", name_en: "Cotton", name_te: "పత్తి" },
                { id: "groundnut", icon: "🥜", name_en: "Groundnut", name_te: "వేరుశనగ" },
                { id: "maize", icon: "🌽", name_en: "Maize", name_te: "మొక్కజొన్న" },
                { id: "sugarcane", icon: "🎋", name_en: "Sugarcane", name_te: "చెరకు" },
                { id: "wheat", icon: "🌾", name_en: "Wheat", name_te: "గోధుమ" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAddCrop(c.id)}
                  className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-left active:scale-95 transition-all"
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-bold text-emerald-950">{lang === "te" ? c.name_te : c.name_en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE ALERT SELECTION MODAL */}
      {/* ========================================================================= */}
      {stageModalTargetCrop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-xl border border-emerald-200">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <span className="text-sm font-extrabold text-emerald-950">
                {lang === "te" ? `మీ ${stageModalTargetCrop.crop_type} ఏ దశలో ఉంది?` : `What stage is your ${stageModalTargetCrop.crop_type} in?`}
              </span>
              <button onClick={() => setStageModalTargetCrop(null)} className="text-zinc-400 hover:text-zinc-700 font-bold text-sm">✕</button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {[
                { id: "Just planted", icon: "🌰", en: "Just planted", te: "ఇప్పుడే విత్తనం వేశాము" },
                { id: "Growing (leaves & stem)", icon: "🌿", en: "Growing (leaves & stem)", te: "ఎదుగుదల దశ (ఆకులు, కొమ్మలు)" },
                { id: "Flowering", icon: "🌸", en: "Flowering", te: "పూత దశ" },
                { id: "Fruit/grain forming", icon: "🍅", en: "Fruit/grain forming", te: "కాయ / గింజ కట్టే దశ" },
                { id: "Almost ready to harvest", icon: "🌾", en: "Almost ready to harvest", te: "కోతకు సిద్ధంగా ఉంది" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleFetchStagePrecautions(stageModalTargetCrop, s.id)}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl p-3 flex items-center space-x-3 text-left active:scale-95 transition-all"
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-xs font-bold text-emerald-950">{lang === "te" ? s.te : s.en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IRRIGATION CALCULATOR MODAL */}
      {/* ========================================================================= */}
      {irrigationModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-xl border border-emerald-200">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <span className="text-sm font-extrabold text-emerald-950">
                💧 {lang === "te" ? "నీటిపారుదల సలహాదారు" : "Irrigation Calculator"}
              </span>
              <button onClick={() => setIrrigationModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 font-bold text-sm">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  🌾 {lang === "te" ? "పంటను ఎంచుకోండి" : "Select Crop"}
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-xs font-bold text-emerald-950"
                >
                  <option value="tomato">Tomato (టమాటా)</option>
                  <option value="rice">Rice (వరి)</option>
                  <option value="chilli">Chilli (మిరప)</option>
                  <option value="cotton">Cotton (పత్తి)</option>
                  <option value="groundnut">Groundnut (వేరుశనగ)</option>
                  <option value="maize">Maize (మొక్కజొన్న)</option>
                  <option value="sugarcane">Sugarcane (చెరకు)</option>
                  <option value="wheat">Wheat (గోధుమ)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  🌱 {lang === "te" ? "పెరుగుదల దశ" : "Growth Stage"}
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-xs font-bold text-emerald-950"
                >
                  <option value="sowing">{lang === "te" ? "విత్తే దశ" : "Sowing / Seedling"}</option>
                  <option value="vegetative">{lang === "te" ? "ఎదుగుదల దశ" : "Vegetative Growth"}</option>
                  <option value="flowering">{lang === "te" ? "పూత దశ" : "Flowering (Critical)"}</option>
                  <option value="harvest">{lang === "te" ? "కోత దశ" : "Harvest / Maturity"}</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setIrrigationModalOpen(false);
                  handleIrrigationSubmit();
                }}
                className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
              >
                {lang === "te" ? "సలహా పొందండి" : "Calculate Runtime"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* SOIL HEALTH CARD MODAL (Values entered by farmer from Soil Card) */}
      {/* ========================================================================= */}
      {soilHealthModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-xl border border-[#D97706]/30">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🧪</span>
                <div>
                  <span className="text-sm font-extrabold text-[#2A2928] block">
                    {lang === "te" ? "నేల ఆరోగ్య కార్డు (Soil Health Card)" : "Soil Health Analysis"}
                  </span>
                  <span className="text-[10px] text-[#4A4947] block font-medium">
                    {lang === "te" ? "మీ సాయిల్ కార్డు విలువలను నమోదు చేయండి" : "Enter values from your Soil Health Card"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSoilHealthModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F3F2EE] hover:bg-[#E5E3DC] text-[#4A4947] font-bold text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Explicit Notice (Not a photo scan) */}
            <div className="bg-[#fef3c7] border border-[#f59e0b]/40 rounded-2xl p-2.5 text-[11px] text-[#92400e] flex items-start space-x-1.5">
              <span>📋</span>
              <p className="leading-snug">
                <b>{lang === "te" ? "గమనిక:" : "Note:"}</b>{" "}
                {lang === "te"
                  ? "ఈ విశ్లేషణ మీరు నమోదు చేసే నేల పరీక్ష సేకరణ విలువలపై ఆధారపడి ఉంటుంది (ఫోటో స్కాన్ కాదు)."
                  : "This analysis is based on values you enter from your official Soil Card (not a photo scan)."}
              </p>
            </div>

            {/* Form Inputs */}
            <div className="space-y-2.5">
              {/* Crop Target */}
              <div>
                <label className="text-[11px] font-bold text-[#4A4947] block mb-1">
                  🌾 {lang === "te" ? "పంటను ఎంచుకోండి (Crop Target):" : "Target Crop:"}
                </label>
                <select
                  value={soilTargetCrop}
                  onChange={(e) => setSoilTargetCrop(e.target.value)}
                  className="w-full bg-[#F3F2EE] border border-[#E5E3DC] rounded-xl p-2 text-xs font-bold text-[#2A2928]"
                >
                  <option value="tomato">Tomato (టమాటా)</option>
                  <option value="rice">Rice (వరి)</option>
                  <option value="chilli">Chilli (మిరప)</option>
                  <option value="cotton">Cotton (పత్తి)</option>
                  <option value="groundnut">Groundnut (వేరుశనగ)</option>
                  <option value="maize">Maize (మొక్కజొన్న)</option>
                  <option value="sugarcane">Sugarcane (చెరకు)</option>
                  <option value="wheat">Wheat (గోధుమ)</option>
                </select>
              </div>

              {/* 2x2 Numeric Inputs: N, P, K, pH */}
              <div className="grid grid-cols-2 gap-2">
                {/* Nitrogen */}
                <div className="bg-[#F3F2EE] p-2 rounded-xl border border-[#E5E3DC]">
                  <label className="text-[10px] font-bold text-[#4A4947] block">
                    🌱 {lang === "te" ? "నత్రజని (N) kg/ha" : "Nitrogen (N) kg/ha"}
                  </label>
                  <input
                    type="number"
                    value={soilN}
                    onChange={(e) => setSoilN(e.target.value)}
                    placeholder="e.g. 240"
                    className="w-full bg-white border border-[#E5E3DC] rounded-lg p-1.5 text-xs font-extrabold text-[#2A2928] mt-1"
                  />
                  <span className="text-[9px] text-[#4A4947]/70 block mt-0.5">ICAR: 280-560 Medium</span>
                </div>

                {/* Phosphorus */}
                <div className="bg-[#F3F2EE] p-2 rounded-xl border border-[#E5E3DC]">
                  <label className="text-[10px] font-bold text-[#4A4947] block">
                    🌾 {lang === "te" ? "భాస్వరం (P) kg/ha" : "Phosphorus (P) kg/ha"}
                  </label>
                  <input
                    type="number"
                    value={soilP}
                    onChange={(e) => setSoilP(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full bg-white border border-[#E5E3DC] rounded-lg p-1.5 text-xs font-extrabold text-[#2A2928] mt-1"
                  />
                  <span className="text-[9px] text-[#4A4947]/70 block mt-0.5">ICAR: 10-25 Medium</span>
                </div>

                {/* Potassium */}
                <div className="bg-[#F3F2EE] p-2 rounded-xl border border-[#E5E3DC]">
                  <label className="text-[10px] font-bold text-[#4A4947] block">
                    🍃 {lang === "te" ? "పొటాష్ (K) kg/ha" : "Potassium (K) kg/ha"}
                  </label>
                  <input
                    type="number"
                    value={soilK}
                    onChange={(e) => setSoilK(e.target.value)}
                    placeholder="e.g. 210"
                    className="w-full bg-white border border-[#E5E3DC] rounded-lg p-1.5 text-xs font-extrabold text-[#2A2928] mt-1"
                  />
                  <span className="text-[9px] text-[#4A4947]/70 block mt-0.5">ICAR: 110-280 Medium</span>
                </div>

                {/* pH */}
                <div className="bg-[#F3F2EE] p-2 rounded-xl border border-[#E5E3DC]">
                  <label className="text-[10px] font-bold text-[#4A4947] block">
                    ⚖️ {lang === "te" ? "నేల pH (Soil pH)" : "Soil pH (1-14)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={soilPh}
                    onChange={(e) => setSoilPh(e.target.value)}
                    placeholder="e.g. 6.8"
                    className="w-full bg-white border border-[#E5E3DC] rounded-lg p-1.5 text-xs font-extrabold text-[#2A2928] mt-1"
                  />
                  <span className="text-[9px] text-[#4A4947]/70 block mt-0.5">Ideal: 6.5 - 7.5</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                disabled={soilSubmitting}
                onClick={() => {
                  setSoilHealthModalOpen(false);
                  setDrawerOpen(false);
                  handleSoilSubmit();
                }}
                className="w-full bg-[#2D5A27] hover:bg-[#23481f] text-white font-bold py-2.5 rounded-2xl text-xs shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1.5 mt-2"
              >
                <span>🧪</span>
                <span>
                  {soilSubmitting
                    ? (lang === "te" ? "విశ్లేషిస్తున్నాము..." : "Analyzing...")
                    : (lang === "te" ? "నేల ఆరోగ్యం విశ్లేషించండి" : "Analyze Soil Health")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
