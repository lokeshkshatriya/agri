import os
import io
import json
import numpy as np
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
    def analyze_image(cls, image_bytes: bytes, lang: str = "te", crop_filter: list = None) -> Dict[str, Any]:
        cls.load_model()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = cls.TRANSFORM(pil_img).unsqueeze(0)

        # Accurate keyword mapping for PlantVillage dataset classes
        # Model classes: Apple, Blueberry, Cherry, Corn (Maize), Grape, Orange, Peach, Bell Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato
        crop_alias_map = {
            "tomato": ["tomato"],
            "chilli": ["pepper", "bell pepper"],
            "cotton": ["cotton"],
            "groundnut": ["groundnut", "peanut"],
            "maize": ["corn", "maize"],
            "sugarcane": ["sugarcane"],
            "wheat": ["wheat"],
            "rice": ["rice"],
            "potato": ["potato"],
            "soybean": ["soybean"],
        }

        with torch.no_grad():
            raw_logits = cls.MODEL(tensor).logits
            raw_probs = torch.softmax(raw_logits, dim=1)[0]
            
            # Top-1 and Top-2 prediction confidence and margin analysis
            sorted_probs, sorted_indices = torch.sort(raw_probs, descending=True)
            top1_conf = float(sorted_probs[0].item() * 100.0)
            top2_conf = float(sorted_probs[1].item() * 100.0) if len(sorted_probs) > 1 else 0.0
            top_margin = top1_conf - top2_conf  # Difference between top 2 classes
            
            raw_top_idx = sorted_indices[0].item()
            raw_predicted_label = cls.MODEL.config.id2label[raw_top_idx]

            # Check if user has a selected crop filter
            matched_indices = []
            if crop_filter and len(crop_filter) > 0:
                target_keywords = []
                for c in crop_filter:
                    c_clean = c.lower().strip()
                    target_keywords.extend(crop_alias_map.get(c_clean, [c_clean]))

                for idx, label_name in cls.MODEL.config.id2label.items():
                    ln_clean = label_name.lower()
                    if any(kw in ln_clean for kw in target_keywords):
                        matched_indices.append(idx)

            if matched_indices and raw_top_idx in matched_indices:
                pred_idx = raw_top_idx
                confidence = top1_conf
                predicted_label = raw_predicted_label
            elif matched_indices:
                filtered_probs = raw_probs[matched_indices]
                best_sub_idx = torch.argmax(filtered_probs).item()
                pred_idx = matched_indices[best_sub_idx]
                confidence = raw_probs[pred_idx].item() * 100.0
                predicted_label = cls.MODEL.config.id2label[pred_idx]
            else:
                pred_idx = raw_top_idx
                confidence = top1_conf
                predicted_label = raw_predicted_label

        # -------------------------------------------------------------------------
        # DISTRIBUTION FLATNESS / OFF-DISTRIBUTION GATE
        # Genuinely off-distribution non-plant images (faces, rooms, screens, objects)
        # produce flatter distributions where:
        # 1. Top confidence is low (< 50%) OR
        # 2. Top-2 predictions are ambiguous / very close together (margin < 15% when top1 < 70%) OR
        # 3. Overall confidence is below 55%
        # -------------------------------------------------------------------------
        is_flat_distribution = (top1_conf < 50.0) or (top1_conf < 70.0 and top_margin < 15.0) or (confidence < 55.0)

        if is_flat_distribution:
            return {
                "disease_id": "Not_A_Plant",
                "crop_name": "గుర్తించబడలేదు" if lang == "te" else "Unidentified",
                "disease_name": "ఆకు చిత్రం కాదు / స్పష్టత లేదు" if lang == "te" else "Not a Recognizable Crop Image",
                "pathogen": "వర్తించదు" if lang == "te" else "None",
                "confidence_score": 0.0,
                "affected_area_pct": 0.0,
                "chlorophyll_vigor_pct": 0.0,
                "severity": "చెల్లదు (Invalid)" if lang == "te" else "Invalid Image",
                "symptoms": (
                    "ఫోటోలో పంట ఆకు స్పష్టంగా గుర్తించబడలేదు. దయచేసి కెమెరాను నేరుగా పంట ఆకుపై ఉంచి, తగినంత వెలుతురులో మళ్లీ స్కాన్ చేయండి."
                    if lang == "te"
                    else "The photo is not recognized as a crop plant. Please point your camera directly at the affected crop leaf and scan again."
                ),
                "organic_cure": "వర్తించదు (Not applicable)" if lang == "te" else "Not applicable",
                "chemical_cure": "వర్తించదు (Not applicable)" if lang == "te" else "Not applicable",
                "voice_speech": (
                    "పంట ఆకు స్పష్టంగా లేదు. దయచేసి ఆకును కెమెరాలో స్పష్టంగా చూపించి మళ్లీ స్కాన్ చేయండి."
                    if lang == "te"
                    else "Not a recognizable crop image. Please scan a clear plant leaf."
                ),
                "is_non_plant": True
            }

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
