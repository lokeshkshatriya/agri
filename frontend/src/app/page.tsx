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

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<"te" | "en">("te");
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 17.3850, lon: 78.4867 });
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

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
          { text: "📷 కెమెరా ఆన్ చేయి", label: "కెమెరా" },
          { text: "🧪 ఆకు మీద నల్లటి మచ్చలు ఉన్నాయి", label: "వ్యాధి స్కాన్" },
          { text: "🌦️ రేపు మందు పిచికారీ చేయవచ్చా?", label: "వాతావరణం" },
          { text: "💧 ఎండగా ఉంది నీళ్లు పెట్టాలా?", label: "నీటిపారుదల" },
          { text: "🌱 ఎరువు ఎంత బస్తాలు వేయాలి?", label: "ఎరువులు" },
          { text: "⚠️ పురుగుల ముప్పు ఉందా?", label: "తెగుళ్ల అలర్ట్" },
        ]
      : [
          { text: "📷 Open camera for leaf photo", label: "Open Camera" },
          { text: "🧪 Black spots on leaves, what disease?", label: "Scan Disease" },
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
              onClick={() => handleSendMessage(qp.text)}
              className="bg-white/80 hover:bg-white text-emerald-900 text-xs font-medium py-2 px-2.5 rounded-xl border border-emerald-200 shadow-sm transition-all text-left active:scale-95 flex items-center justify-between"
            >
              <span className="truncate">{qp.label}</span>
              <span className="text-[10px] text-emerald-600">➔</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversational Feed */}
      <div className="w-full max-w-lg flex flex-col space-y-3 mt-2 flex-grow">
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
                    {msg.confidence && (
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
              // Try HTML5 media stream first, fallback to native mobile camera input
              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
