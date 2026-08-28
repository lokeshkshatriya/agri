import os
import json
from typing import Dict, Any

class AgronomyReasoningEngine:
    """
    Constrained Agronomy Reasoning Layer for AgriSahayak.
    Transforms raw vision predictions into structured clinical agronomic prescriptions:
    1. Urgency Level (Green / Yellow / Red)
    2. Cost-Tiered Treatment Matrix (Tier 1 Organic vs Tier 2/3 Chemical with ₹/acre estimates)
    3. Biological Treatment Timeline & Anti-Overdosing Patience Counter
    4. Safety & Low-Confidence Escalation Gate (<75%)
    """

    REASONING_KNOWLEDGE_BASE = {
        "Tomato___Early_blight": {
            "urgency_base": "MODERATE",
            "tier_1": {
                "name_en": "Neem Seed Kernel Extract (NSKE 5%) + Trichoderma viride",
                "name_te": "వేప గింజల కషాయం (5%) + ట్రైకోడెర్మా విరిడే (10 గ్రా/లీ)",
                "dosage_en": "10 g/L of water. Spray in early morning.",
                "dosage_te": "10 గ్రాములు లీటరు నీటికి కలిపి ఉదయం పూట పిచికారీ చేయండి.",
                "cost_inr": "₹80 - ₹140 / acre",
                "result_days": "4 to 6 days",
                "patience_note_en": "Biological agents need 4-6 days to colonize. Do NOT apply chemicals before Day 6.",
                "patience_note_te": "సేంద్రీయ మందు ప్రభావం చూపడానికి 4-6 రోజులు పడుతుంది. 6 రోజుల వరకు రసాయన మందులు వేయవద్దు."
            },
            "tier_2": {
                "name_en": "Mancozeb 75% WP (Contact Protectant)",
                "name_te": "మాంకోజెబ్ 75% WP (Mancozeb)",
                "dosage_en": "2.5 g/L of water",
                "dosage_te": "2.5 గ్రాములు లీటరు నీటికి",
                "cost_inr": "₹350 - ₹450 / acre"
            },
            "tier_3": {
                "name_en": "Azoxystrobin 23% SC or Difenoconazole 25% EC (Curative Systemic)",
                "name_te": "అజోక్సిస్ట్రోబిన్ లేదా డైఫెనోకోనజోల్ (సిస్టమిక్)",
                "dosage_en": "1.0 ml/L of water",
                "dosage_te": "1.0 మి.లీ లీటరు నీటికి",
                "cost_inr": "₹850 - ₹1200 / acre"
            }
        },
        "Tomato___Late_blight": {
            "urgency_base": "CRITICAL",
            "tier_1": {
                "name_en": "Copper Oxychloride 50% WP + Fermented Buttermilk (5%)",
                "name_te": "కాపర్ ఆక్సిక్లోరైడ్ 50% WP + పులిసిన మజ్జిగ ద్రావణం",
                "dosage_en": "2.5 g/L of water",
                "dosage_te": "2.5 గ్రాములు లీటరు నీటికి",
                "cost_inr": "₹120 - ₹180 / acre",
                "result_days": "3 to 4 days",
                "patience_note_en": "Late Blight spreads aggressively in cool/wet conditions. Monitor daily.",
                "patience_note_te": "లేట్ బ్లైట్ త్వరగా వ్యాపిస్తుంది. రోజువారీగా గమనించండి."
            },
            "tier_2": {
                "name_en": "Cymoxanil 8% + Mancozeb 64% WP (Curzate)",
                "name_te": "కర్జేట్ (Curzate 2 గ్రా/లీ)",
                "dosage_en": "2.0 g/L of water",
                "dosage_te": "2.0 గ్రాములు లీటరు నీటికి",
                "cost_inr": "₹450 - ₹600 / acre"
            },
            "tier_3": {
                "name_en": "Dimethomorph 50% WP or Metalaxyl-M (Ridomil Gold)",
                "name_te": "రిడోమిల్ గోల్డ్ లేదా డైమెథోమార్ఫ్ (అత్యవసర నివారణ)",
                "dosage_en": "1.5 g/L of water",
                "dosage_te": "1.5 గ్రాములు లీటరు నీటికి",
                "cost_inr": "₹950 - ₹1450 / acre"
            }
        },
        "Potato___Late_blight": {
            "urgency_base": "CRITICAL",
            "tier_1": {
                "name_en": "Bordeaux Mixture 1% or Copper Oxychloride",
                "name_te": "బోర్డో మిశ్రమం 1% లేదా కాపర్ ఆక్సిక్లోరైడ్",
                "dosage_en": "2.5 g/L",
                "dosage_te": "2.5 గ్రాములు లీటరు నీటికి",
                "cost_inr": "₹100 - ₹160 / acre",
                "result_days": "3 to 5 days",
                "patience_note_en": "Copper protectant shields healthy foliage. Allow 4 days before re-evaluation.",
                "patience_note_te": "కాపర్ మందు ఆరోగ్యకరమైన ఆకులను రక్షిస్తుంది. 4 రోజుల తర్వాత మళ్లీ గమనించండి."
            },
            "tier_2": {
                "name_en": "Metalaxyl 8% + Mancozeb 64% WP (Ridomil MZ)",
                "name_te": "రిడోమిల్ MZ (2 గ్రా/లీ)",
                "dosage_en": "2.0 g/L of water",
                "dosage_te": "2.0 గ్రాములు లీటరు నీటికి",
                "cost_inr": "₹480 - ₹650 / acre"
            },
            "tier_3": {
                "name_en": "Mandipropamid 23.4% SC (Revus)",
                "name_te": "రెవస్ (Mandipropamid 0.8 మి.లీ/లీ)",
                "dosage_en": "0.8 ml/L of water",
                "dosage_te": "0.8 మి.లీ లీటరు నీటికి",
                "cost_inr": "₹1100 - ₹1600 / acre"
            }
        },
        "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
            "urgency_base": "MODERATE",
            "tier_1": {
                "name_en": "12 Yellow Sticky Traps/Acre + 5% Pure Neem Oil",
                "name_te": "ఎకరాకు 12 పసుపు జిగురు అట్టలు + 5% వేపనూనె పిచికారీ",
                "dosage_en": "5 ml/L with soap emulsifier",
                "dosage_te": "5 మి.లీ లీటరు నీటికి",
                "cost_inr": "₹90 - ₹150 / acre",
                "result_days": "5 to 7 days",
                "patience_note_en": "Sticky traps trap vector whiteflies continuously. Give bio-oil 5 days to reduce egg hatching.",
                "patience_note_te": "జిగురు అట్టలు తెల్లదోమలను నిరంతరం పట్టుకుంటాయి. 5 రోజుల వరకు వేచి చూడండి."
            },
            "tier_2": {
                "name_en": "Acetamiprid 20% SP (Vector Control)",
                "name_te": "ఎసిటామిప్రిడ్ 20% SP (తెల్లదోమ నివారణ)",
                "dosage_en": "0.3 g/L of water",
                "dosage_te": "0.3 గ్రాములు లీటరు నీటికి",
                "cost_inr": "₹280 - ₹380 / acre"
            },
            "tier_3": {
                "name_en": "Diafenthiuron 50% WP or Spiromesifen 22.9% SC",
                "name_te": "డయాఫెంథియురాన్ లేదా స్పైరోమెసిఫెన్",
                "dosage_en": "1.2 g/L of water",
                "dosage_te": "1.2 గ్రాములు లీటరు నీటికి",
                "cost_inr": "₹750 - ₹1100 / acre"
            }
        }
    }

    @classmethod
    def apply_reasoning(cls, diagnosis_data: Dict[str, Any], lang: str = "te") -> Dict[str, Any]:
        """
        Applies clinical reasoning to the vision output.
        """
        disease_id = diagnosis_data.get("disease_id", "")
        confidence = float(diagnosis_data.get("confidence_score", 90.0))
        affected_area = float(diagnosis_data.get("affected_area_pct", 0.0))
        is_healthy = "healthy" in disease_id.lower() or "Healthy" in diagnosis_data.get("disease_name", "")
        is_non_plant = diagnosis_data.get("is_non_plant", False) or disease_id == "Not_A_Plant"

        # If image is not a plant leaf, return dedicated advisory without false pest treatment
        if is_non_plant:
            return {
                "urgency_level": "INVALID",
                "urgency_color": "zinc",
                "urgency_label": "చెల్లని చిత్రం (Invalid Image)" if lang == "te" else "Invalid Image / Not a Plant",
                "is_escalated": False,
                "is_non_plant": True,
                "escalation_reason": None,
                "kisan_helpline": "1800-180-1551",
                "tier_1_organic": None,
                "tier_2_moderate": None,
                "tier_3_systemic": None,
                "voice_reasoning": (
                    "ఫోటోలో పంట ఆకు కనిపించడం లేదు. దయచేసి పంట ఆకును స్పష్టంగా కెమెరాలో చూపించి మళ్లీ స్కాన్ చేయండి."
                    if lang == "te"
                    else "The photo does not contain a crop leaf. Please scan a clear picture of the plant leaf."
                )
            }

        # 1. Escalation Flag (<75% confidence or ambiguous scan)
        is_escalated = (confidence < 75.0) and not is_healthy
        escalation_reason_en = "Scan confidence is below clinical threshold (75%). Routing to agricultural officer." if is_escalated else None
        escalation_reason_te = "వ్యాధి నిర్ధారణ ఖచ్చితత్వం 75% కంటే తక్కువగా ఉంది. కిసాన్ కాల్ సెంటర్ అధికారికి సిఫార్సు చేయబడింది." if is_escalated else None

        # 2. Urgency Scoring (Green / Yellow / Red)
        if is_healthy:
            urgency_level = "LOW"
            urgency_color = "emerald"
            urgency_label_en = "🟢 Low Urgency / Routine Monitoring"
            urgency_label_te = "🟢 తక్కువ అత్యవసరత (సాధారణ పర్యవేక్షణ)"
        elif affected_area > 40.0 or "Late_blight" in disease_id or "Bacterial" in disease_id:
            urgency_level = "CRITICAL"
            urgency_color = "red"
            urgency_label_en = "🔴 Critical Urgency / Action Required (<24 Hours)"
            urgency_label_te = "🔴 అత్యవసరం / 24 గంటల్లో చర్య అవసరం"
        else:
            urgency_level = "MODERATE"
            urgency_color = "amber"
            urgency_label_en = "🟡 Moderate Urgency / Action within 48-72 Hours"
            urgency_label_te = "🟡 మధ్యస్థ అత్యవసరత (48-72 గంటల్లో చర్య తీసుకోండి)"

        # 3. Retrieve or synthesize Cost-Tiered Matrix
        disease_profile = cls.REASONING_KNOWLEDGE_BASE.get(disease_id)
        if not disease_profile:
            # Fallback standardized tiering
            tier_1 = {
                "name": diagnosis_data.get("organic_cure", "Neem Seed Extract / Bio-fungicide"),
                "dosage": "5-10 ml/L",
                "cost_inr": "₹80 - ₹150 / acre",
                "result_days": "4 to 6 days",
                "patience_note": "Biological controls require 4-6 days to suppress spores. Do NOT apply chemicals prematurely." if lang == "en" else "సేంద్రీయ మందు ప్రభావం చూపడానికి 4-6 రోజులు పడుతుంది. తొందరపడి రసాయనాలు వాడవద్దు."
            }
            tier_2 = {
                "name": diagnosis_data.get("chemical_cure", "Standard Contact Fungicide"),
                "dosage": "2.0 g/L",
                "cost_inr": "₹350 - ₹500 / acre"
            }
            tier_3 = {
                "name": "Advanced Systemic Curative (Triazole / Strobilurin)",
                "dosage": "1.0 ml/L",
                "cost_inr": "₹850 - ₹1300 / acre"
            }
        else:
            t1 = disease_profile["tier_1"]
            t2 = disease_profile["tier_2"]
            t3 = disease_profile["tier_3"]
            tier_1 = {
                "name": t1[f"name_{lang}"],
                "dosage": t1[f"dosage_{lang}"],
                "cost_inr": t1["cost_inr"],
                "result_days": t1["result_days"],
                "patience_note": t1[f"patience_note_{lang}"]
            }
            tier_2 = {
                "name": t2[f"name_{lang}"],
                "dosage": t2[f"dosage_{lang}"],
                "cost_inr": t2["cost_inr"]
            }
            tier_3 = {
                "name": t3[f"name_{lang}"],
                "dosage": t3[f"dosage_{lang}"],
                "cost_inr": t3["cost_inr"]
            }

        # 4. Formulate localized voice summary
        if is_healthy:
            voice_reasoning = "మీ పంట ఆకు పూర్తి ఆరోగ్యంగా ఉంది. ఎలాంటి రసాయన మందులు అవసరం లేదు." if lang == "te" else "Your crop leaf is healthy. No chemical sprays are needed."
        elif is_escalated:
            voice_reasoning = "వ్యాధి లక్షణాలు స్పష్టంగా లేవు. ఉచిత కిసాన్ హెల్ప్‌లైన్ 1800-180-1551 కి కాల్ చేసి మాట్లాడండి." if lang == "te" else "Scan is inconclusive. Please dial Kisan Helpline 1800-180-1551 for free officer advice."
        else:
            voice_reasoning = f"{diagnosis_data.get('disease_name', '')} గుర్తించబడింది. అత్యవసరత: {urgency_label_te}. మొదట సేంద్రీయ నివారణ ప్రయత్నించండి." if lang == "te" else f"{diagnosis_data.get('disease_name', '')} identified. Urgency is {urgency_level}. Try Tier 1 organic control first."

        return {
            "urgency_level": urgency_level,
            "urgency_color": urgency_color,
            "urgency_label": urgency_label_te if lang == "te" else urgency_label_en,
            "is_escalated": is_escalated,
            "escalation_reason": escalation_reason_te if lang == "te" else escalation_reason_en,
            "kisan_helpline": "1800-180-1551",
            "tier_1_organic": tier_1,
            "tier_2_moderate": tier_2,
            "tier_3_systemic": tier_3,
            "voice_reasoning": voice_reasoning
        }
