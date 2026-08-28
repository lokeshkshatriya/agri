import io
import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gtts import gTTS
from intent_classifier import AgriIntentClassifier
from disease_classifier import HybridDiseaseClassifier
from fastapi import UploadFile, File, Form

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

class TTSRequest(BaseModel):
    text: str
    lang: str = "te"

@app.get("/")
def root():
    return {"status": "AgriSahayak AI Backend Running", "supported_languages": ["te", "en"]}

@app.post("/api/voice/intent")
def parse_voice_intent(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    result = AgriIntentClassifier.classify(req.query, current_lang=req.lang)
    
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
    Analyzes an uploaded leaf image using Hybrid AI and returns:
    Confidence %, Affected Area %, Chlorophyll Vigor, Organic & Chemical Cures, and TTS audio.
    """
    try:
        contents = await file.read()
        diag = HybridDiseaseClassifier.analyze_image(contents, lang=lang)
        
        # Generate TTS audio for the diagnosis
        audio_b64 = ""
        try:
            tts_lang = "te" if lang == "te" else "en"
            tts = gTTS(text=diag["voice_speech"], lang=tts_lang, slow=False)
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
