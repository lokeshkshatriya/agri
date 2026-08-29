# 🌾 UrvanAI (ఉర్వన్ AI)
**An Intelligent, Voice-First Agricultural Copilot for Farmers**

UrvanAI is a multimodal, multilingual web platform designed to assist farmers with rapid crop disease diagnosis, hyperlocal weather advisories, soil health calculations, and smart irrigation scheduling. Built for accessibility, it requires no heavy app downloads and features a voice-first Agentic UI that understands natural language.

---

## 🌟 Key Features

* **📷 AI Crop Disease Scanner:** Real-time leaf scanning using a fine-tuned MobileNetV2 Deep Learning model (trained on the PlantVillage dataset) to identify 38+ crop diseases and recommend localized treatments.
* **🗣️ NLP & Agentic UI:** A semantic intent classifier that understands natural language (Telugu & English). If a farmer asks "How much fertilizer?", the AI automatically navigates the app and opens the Soil Health form for them.
* **🧪 Soil Health & Fertilizer Calculator:** Enter your N-P-K and pH values from a Soil Health Card, and the ICAR-based algorithmic engine will prescribe the exact bags of Urea, DAP, and Potash needed for your specific crop.
* **🌦️ Smart Weather & Spray Advisory:** Uses GPS and Reverse Geocoding to fetch hyperlocal weather (wind, rain probability) and calculates the safest time windows for pesticide spraying.
* **💧 Evapotranspiration Irrigation Engine:** Calculates precise motor pump runtimes based on current heat and crop growth stages.
* **🔊 Voice Accessibility:** Every diagnosis and recommendation is read aloud via Text-to-Speech (TTS) for low-literacy accessibility.

## 🛠️ Tech Stack

### Frontend (The Edge)
* **Framework:** Next.js 15 (App Router) & React 19
* **Language:** TypeScript
* **Styling:** Tailwind CSS (Custom Agro-palette)
* **Web APIs:** HTML5 WebRTC (Camera), Web Speech API (Dictation), Geolocation API

### Backend (The Brain)
* **Framework:** FastAPI (Python 3.11) & Uvicorn
* **Machine Learning:** PyTorch, HuggingFace Transformers
* **NLP/Audio:** Google TTS (gTTS), Semantic Keyword Routing
* **External APIs:** Open-Meteo (Weather), OpenStreetMap Nominatim (Reverse Geocoding)

---

## 🚀 Getting Started (Local Development)

This project is structured as a Monorepo. You will need to run the backend and frontend servers simultaneously.

### 1. Start the FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend will be running at `http://localhost:8000`*

### 2. Start the Next.js Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will be running at `http://localhost:3000`*

---

## 🛡️ Out-Of-Domain Probability Detection
UrvanAI features a custom mathematical "Flatness" distribution gate. If a user scans a non-plant image (like a keyboard or face), the AI calculates the probability margins and gracefully rejects the image ("No Crop Leaf Detected") rather than hallucinating a false disease.
