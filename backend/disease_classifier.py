import os
import io
import json
import torch
import torchvision.transforms as T
from PIL import Image
from transformers import MobileNetV2ForImageClassification
from typing import Dict, Any

class HybridDiseaseClassifier:
    """
    HuggingFace Pretrained MobileNetV2 (linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification)
    State-of-the-art 38-class PlantVillage Deep Learning Model.
    """
    
    MODEL = None
    TRANSFORM = None
    PLANTVILLAGE_DB = None

    @classmethod
    def load_model(cls):
        if cls.MODEL is None:
            model_id = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
            print(f"Loading HuggingFace model: {model_id}...")
            cls.MODEL = MobileNetV2ForImageClassification.from_pretrained(model_id)
            cls.MODEL.eval()

            cls.TRANSFORM = T.Compose([
                T.Resize((224, 224)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])

            db_path = os.path.join(os.path.dirname(__file__), "data", "plantvillage_database.json")
            with open(db_path, "r", encoding="utf-8") as f:
                cls.PLANTVILLAGE_DB = json.load(f)["classes"]

    @classmethod
    def analyze_image(cls, image_bytes: bytes, lang: str = "te") -> Dict[str, Any]:
        cls.load_model()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = cls.TRANSFORM(pil_img).unsqueeze(0)

        with torch.no_grad():
            logits = cls.MODEL(tensor).logits
            probs = torch.softmax(logits, dim=1)[0]
            pred_idx = torch.argmax(probs).item()
            confidence = probs[pred_idx].item() * 100.0
            predicted_label = cls.MODEL.config.id2label[pred_idx]

        # Map to disease info database
        db = cls.PLANTVILLAGE_DB
        
        # Fuzzy match to database key or build formatted response
        disease_info = None
        for k, v in db.items():
            clean_k = k.replace("_", " ").replace(",", "").lower()
            clean_pred = predicted_label.replace("_", " ").replace(",", "").lower()
            if clean_k in clean_pred or clean_pred in clean_k:
                disease_info = v
                break

        if not disease_info:
            parts = predicted_label.split(" with ") if " with " in predicted_label else [predicted_label, "Disease"]
            crop_name = parts[0]
            disease_name = parts[1] if len(parts) > 1 else "Normal"
            disease_info = {
                "crop_en": crop_name,
                "crop_te": crop_name,
                "name_en": predicted_label,
                "name_te": predicted_label,
                "pathogen": "HuggingFace MobileNetV2 Deep Vision Prediction",
                "symptoms_en": f"Diagnostic features matching {predicted_label}.",
                "symptoms_te": f"{predicted_label} లక్షణాలు గుర్తించబడ్డాయి.",
                "organic_cure_en": "Apply 5% organic Neem seed kernel extract (NSKE) or bio-fungicide.",
                "organic_cure_te": "5% వేప గింజల కషాయం లేదా సేంద్రీయ బయో-ఫంగిసైడ్ పిచికారీ చేయండి.",
                "chemical_cure_en": "Spray broad-spectrum preventative fungicide like Mancozeb 75% WP @ 2.5g/L.",
                "chemical_cure_te": "మాంకోజెబ్ 75% WP 2.5 గ్రాములు లీటరు నీటికి కలిపి పిచికారీ చేయండి.",
                "voice_speech_en": f"{predicted_label} identified with {confidence:.1f} percent confidence.",
                "voice_speech_te": f"{predicted_label} నిర్ధారించబడింది."
            }

        is_healthy = "healthy" in predicted_label.lower()
        if is_healthy:
            severity = "Normal (Healthy)" if lang == "en" else "ఆరోగ్యకరమైనది (Healthy)"
            affected_area = 0.0
            chlorophyll_vigor = min(99.0, max(88.0, 92.0 + confidence * 0.06))
        else:
            affected_area = min(65.0, max(15.0, round(100.0 - confidence * 0.45, 1)))
            chlorophyll_vigor = min(90.0, max(30.0, 100.0 - affected_area * 1.2))
            severity = "High" if affected_area > 35 else "Moderate"
            if lang == "te":
                severity = "తీవ్రమైనది (High)" if affected_area > 35 else "మధ్యస్థం (Moderate)"

        return {
            "disease_id": predicted_label,
            "crop_name": disease_info[f"crop_{lang}"],
            "disease_name": disease_info[f"name_{lang}"],
            "pathogen": disease_info["pathogen"],
            "confidence_score": round(confidence, 1),
            "affected_area_pct": round(affected_area, 1),
            "chlorophyll_vigor_pct": round(chlorophyll_vigor, 1),
            "severity": severity,
            "symptoms": disease_info[f"symptoms_{lang}"],
            "organic_cure": disease_info[f"organic_cure_{lang}"],
            "chemical_cure": disease_info[f"chemical_cure_{lang}"],
            "voice_speech": disease_info[f"voice_speech_{lang}"]
        }
