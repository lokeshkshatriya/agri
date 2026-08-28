import io
import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gtts import gTTS
from intent_classifier import AgriIntentClassifier
from disease_classifier import HybridDiseaseClassifier
from agronomy_reasoning import AgronomyReasoningEngine
from weather_service import WeatherAdvisoryService
from fastapi import UploadFile, File, Form, Query

app = FastAPI(title="AgriSahayak AI Voice Backend", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    lang: str = "te"  # 'te' for Telugu, 'en' for English
    lat: float = 17.3850
    lon: float = 78.4867

class TTSRequest(BaseModel):
    text: str
    lang: str = "te"

@app.get("/")
def root():
    return {"status": "AgriSahayak AI Backend Running", "supported_languages": ["te", "en"]}

@app.get("/api/weather/advisory")
def get_weather_advisory(lat: float = Query(17.3850), lon: float = Query(78.4867), lang: str = Query("te")):
    """
    Returns real-time Open-Meteo weather + dynamic safe pesticide spraying window.
    """
    weather = WeatherAdvisoryService.get_weather_and_spray_advisory(lat=lat, lon=lon, lang=lang)
    
    audio_b64 = ""
    try:
        tts_lang = "te" if lang == "te" else "en"
        tts = gTTS(text=weather["voice_text"], lang=tts_lang, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_b64 = f"data:audio/mp3;base64,{base64.b64encode(fp.read()).decode('utf-8')}"
    except Exception as e:
        print(f"Weather TTS error: {e}")

    weather["audio_b64"] = audio_b64
    return weather

@app.post("/api/voice/intent")
def parse_voice_intent(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    result = AgriIntentClassifier.classify(req.query, current_lang=req.lang)

    # If the intent is CHECK_WEATHER, attach real-time dynamic weather data
    if result.get("intent") == "CHECK_WEATHER":
        weather_data = WeatherAdvisoryService.get_weather_and_spray_advisory(lat=req.lat, lon=req.lon, lang=req.lang)
        result["weather_data"] = weather_data
        result["reply_text"] = weather_data["spray_advice"]
        result["voice_text"] = weather_data["voice_text"]
    
    audio_b64 = ""
    try:
        tts_lang = "te" if req.lang == "te" else "en"
        tts = gTTS(text=result["voice_text"], lang=tts_lang, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_b64 = f"data:audio/mp3;base64,{base64.b64encode(fp.read()).decode('utf-8')}"
    except Exception as e:
        print(f"TTS generation error: {e}")
    
    result["audio_b64"] = audio_b64
    return result

@app.post("/api/crop/diagnose")
async def diagnose_crop_image(file: UploadFile = File(...), lang: str = Form("te")):
    """
    Analyzes leaf image with Deep Learning + applies Agronomy Reasoning Layer:
    Urgency (Green/Yellow/Red), Cost-Ranked Tiers (₹/acre), Bio Timelines, and Escalation Gates.
    """
    try:
        contents = await file.read()
        diag = HybridDiseaseClassifier.analyze_image(contents, lang=lang)
        
        # Apply Agronomy Reasoning Layer
        reasoning = AgronomyReasoningEngine.apply_reasoning(diag, lang=lang)
        diag["reasoning"] = reasoning

        # Generate TTS audio for the reasoning summary
        audio_b64 = ""
        try:
            tts_lang = "te" if lang == "te" else "en"
            tts = gTTS(text=reasoning["voice_reasoning"], lang=tts_lang, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            audio_b64 = f"data:audio/mp3;base64,{base64.b64encode(fp.read()).decode('utf-8')}"
        except Exception as tts_err:
            print(f"Diagnosis TTS error: {tts_err}")
            
        diag["audio_b64"] = audio_b64
        return diag
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice/tts")
def synthesize_tts(req: TTSRequest):
    """
    Generates text-to-speech audio in Telugu or English.
    """
    try:
        tts_lang = "te" if req.lang == "te" else "en"
        tts = gTTS(text=req.text, lang=tts_lang, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_b64 = f"data:audio/mp3;base64,{base64.b64encode(fp.read()).decode('utf-8')}"
        return {"audio_b64": audio_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
