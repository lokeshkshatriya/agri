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
from irrigation import get_irrigation_recommendation, CROP_WATER_NEEDS
from crop_stages import get_crop_stage_precautions, CROP_STAGE_RISKS
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

class FileUpdateRequest(BaseModel):
    content: str

@app.post("/api/dev/update-page")
def update_page_tsx(req: FileUpdateRequest):
    target = r"c:\Users\Lokesh Kumar\Desktop\AgriHelp\frontend\src\app\page.tsx"
    with open(target, "w", encoding="utf-8") as f:
        f.write(req.content)
    return {"status": "ok", "bytes": len(req.content)}

class QueryRequest(BaseModel):
    query: str
    lang: str = "te"  # 'te' for Telugu, 'en' for English
    lat: float = 17.3850
    lon: float = 78.4867

class IrrigationRequest(BaseModel):
    lat: float = 17.3850
    lon: float = 78.4867
    crop_type: str = "tomato"
    growth_stage: str = "vegetative"
    lang: str = "te"

class CropPrecautionRequest(BaseModel):
    crop_type: str = "tomato"
    stage: str = "Flowering"
    lang: str = "te"

class TTSRequest(BaseModel):
    text: str
    lang: str = "te"

@app.get("/")
def root():
    return {"status": "AgriSahayak AI Backend Running", "supported_languages": ["te", "en"]}

@app.post("/api/crops/precautions")
def get_crop_precautions(req: CropPrecautionRequest):
    """
    Returns non-technical plain-language stage risks, signs, and actions + TTS audio.
    """
    result = get_crop_stage_precautions(
        crop_type=req.crop_type,
        stage=req.stage,
        lang=req.lang
    )

    audio_b64 = ""
    try:
        tts_lang = "te" if req.lang == "te" else "en"
        tts = gTTS(text=result["voice_text"], lang=tts_lang, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_b64 = f"data:audio/mp3;base64,{base64.b64encode(fp.read()).decode('utf-8')}"
    except Exception as e:
        print(f"Crop Precaution TTS error: {e}")

    result["audio_b64"] = audio_b64
    return result

@app.get("/api/irrigation/crops")
def get_supported_irrigation_crops():
    return {
        "crops": [
            {"id": k, "name_en": v["name_en"], "name_te": v["name_te"]}
            for k, v in CROP_WATER_NEEDS.items()
        ],
        "stages": ["sowing", "vegetative", "flowering", "harvest"]
    }

@app.post("/api/irrigation/recommend")
def recommend_irrigation(req: IrrigationRequest):
    """
    Computes crop water requirements and forecasts rainfall to output actionable irrigation advice.
    """
    result = get_irrigation_recommendation(
        lat=req.lat,
        lon=req.lon,
        crop_type=req.crop_type,
        growth_stage=req.growth_stage,
        lang=req.lang
    )

    audio_b64 = ""
    try:
        tts_lang = "te" if req.lang == "te" else "en"
        tts = gTTS(text=result["voice_text"], lang=tts_lang, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_b64 = f"data:audio/mp3;base64,{base64.b64encode(fp.read()).decode('utf-8')}"
    except Exception as e:
        print(f"Irrigation TTS error: {e}")

    result["audio_b64"] = audio_b64
    return result

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
    elif result.get("intent") == "IRRIGATION_ADVICE":
        irrigation_data = get_irrigation_recommendation(lat=req.lat, lon=req.lon, crop_type="tomato", growth_stage="flowering", lang=req.lang)
        result["irrigation_data"] = irrigation_data
        result["reply_text"] = f"{irrigation_data['recommendation']}: {irrigation_data['reason']}"
        result["voice_text"] = irrigation_data["voice_text"]
    
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
async def diagnose_crop_image(
    file: UploadFile = File(...),
    lang: str = Form("te"),
    crop_filter: str = Form(None)
):
    """
    Analyzes leaf image with Deep Learning + applies Agronomy Reasoning Layer:
    Urgency (Green/Yellow/Red), Cost-Ranked Tiers (₹/acre), Bio Timelines, and Escalation Gates.
    Can be constrained to the farmer's saved crop portfolio.
    """
    try:
        contents = await file.read()
        crops_list = [c.strip() for c in crop_filter.split(",") if c.strip()] if crop_filter else None
        diag = HybridDiseaseClassifier.analyze_image(contents, lang=lang, crop_filter=crops_list)
        
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
