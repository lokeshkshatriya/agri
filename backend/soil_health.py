from typing import Dict, Any, Optional

# Standard Indian ICAR / State Agriculture Department Classification Ranges
SOIL_NUTRIENT_RANGES = {
    "nitrogen": {
        "unit": "kg/ha",
        "low": {
            "max": 280.0,
            "label_en": "Low (< 280 kg/ha)",
            "label_te": "తక్కువ (< 280 కేజీ/హెక్టారు)",
            "status_en": "Low",
            "status_te": "తక్కువ",
            "advice_en": "Apply extra Urea or well-decomposed organic compost / FYM before sowing.",
            "advice_te": "విత్తే ముందు అదనంగా యూరియా లేదా పశువుల ఎరువు / కంపోస్ట్ వేయండి."
        },
        "medium": {
            "min": 280.0,
            "max": 560.0,
            "label_en": "Medium (280 - 560 kg/ha)",
            "label_te": "మధ్యస్థం (280 - 560 కేజీ/హెక్టారు)",
            "status_en": "Medium",
            "status_te": "మధ్యస్థం",
            "advice_en": "Maintain standard recommended dose of Nitrogen fertilizer for your crop.",
            "advice_te": "మీ పంటకు సిఫార్సు చేసిన సాధారణ నత్రజని మోతాదును కొనసాగించండి."
        },
        "high": {
            "min": 560.0,
            "label_en": "High (> 560 kg/ha)",
            "label_te": "ఎక్కువ (> 560 కేజీ/హెక్టారు)",
            "status_en": "High",
            "status_te": "ఎక్కువ",
            "advice_en": "Reduce or skip initial nitrogen application to avoid excessive vegetative growth and pest vulnerability.",
            "advice_te": "అధిక ఎదుగుదల మరియు పురుగుల దాడిని నివారించడానికి నత్రజని వాడకాన్ని తగ్గించండి."
        }
    },
    "phosphorus": {
        "unit": "kg/ha",
        "low": {
            "max": 10.0,
            "label_en": "Low (< 10 kg/ha)",
            "label_te": "తక్కువ (< 10 కేజీ/హెక్టారు)",
            "status_en": "Low",
            "status_te": "తక్కువ",
            "advice_en": "Apply Single Super Phosphate (SSP) or DAP as basal dose at sowing to boost root development.",
            "advice_te": "వేరు వ్యవస్థ బలంగా ఎదగడానికి విత్తే సమయంలో డీఏపీ (DAP) లేదా సూపర్ ఫాస్ఫేట్ వేయండి."
        },
        "medium": {
            "min": 10.0,
            "max": 25.0,
            "label_en": "Medium (10 - 25 kg/ha)",
            "label_te": "మధ్యస్థం (10 - 25 కేజీ/హెక్టారు)",
            "status_en": "Medium",
            "status_te": "మధ్యస్థం",
            "advice_en": "Adequate phosphorus available. Apply standard basal fertilizer dose.",
            "advice_te": "భాస్వరం తగినంత ఉంది. సాధారణ మోతాదులో బేసల్ ఎరువులు వేయండి."
        },
        "high": {
            "min": 25.0,
            "label_en": "High (> 25 kg/ha)",
            "label_te": "ఎక్కువ (> 25 కేజీ/హెక్టారు)",
            "status_en": "High",
            "status_te": "ఎక్కువ",
            "advice_en": "High phosphorus level. Avoid phosphatic fertilizers this season to prevent micronutrient imbalance.",
            "advice_te": "భాస్వరం చాలా ఎక్కువగా ఉంది. ఈ సీజన్ లో భాస్వరం ఎరువుల వాడకాన్ని నివారించండి."
        }
    },
    "potassium": {
        "unit": "kg/ha",
        "low": {
            "max": 110.0,
            "label_en": "Low (< 110 kg/ha)",
            "label_te": "తక్కువ (< 110 కేజీ/హెక్టారు)",
            "status_en": "Low",
            "status_te": "తక్కువ",
            "advice_en": "Apply Muriate of Potash (MOP) to improve crop disease immunity and grain/fruit quality.",
            "advice_te": "పంట నాణ్యత మరియు రోగనిరోధక శక్తి పెంచడానికి పొటాష్ (MOP) వేయండి."
        },
        "medium": {
            "min": 110.0,
            "max": 280.0,
            "label_en": "Medium (110 - 280 kg/ha)",
            "label_te": "మధ్యస్థం (110 - 280 కేజీ/హెక్టారు)",
            "status_en": "Medium",
            "status_te": "మధ్యస్థం",
            "advice_en": "Normal potassium availability. Maintain recommended split doses.",
            "advice_te": "పొటాష్ సాధారణ స్థాయిలో ఉంది. సమయానికి సాధారణ మోతాదులు అందించండి."
        },
        "high": {
            "min": 280.0,
            "label_en": "High (> 280 kg/ha)",
            "label_te": "ఎక్కువ (> 280 కేజీ/హెక్టారు)",
            "status_en": "High",
            "status_te": "ఎక్కువ",
            "advice_en": "Soil is rich in potassium. You can reduce potash application this season.",
            "advice_te": "నేలలో పొటాష్ సమృద్ధిగా ఉంది. ఈ పంట కాలంలో పొటాష్ మోతాదు తగ్గించవచ్చు."
        }
    },
    "ph": {
        "unit": "pH",
        "acidic": {
            "max": 6.5,
            "label_en": "Acidic (< 6.5)",
            "label_te": "ఆమ్ల నేల (< 6.5)",
            "status_en": "Acidic",
            "status_te": "ఆమ్ల నేల",
            "advice_en": "Soil is acidic. Apply Agricultural Lime (Calcium carbonate) or Dolomite to raise soil pH.",
            "advice_te": "నేల ఆమ్ల గుణం కలిగి ఉంది. సున్నం లేదా డోలమైట్ వేసి నేల pH ని సరిచేయండి."
        },
        "neutral": {
            "min": 6.5,
            "max": 7.5,
            "label_en": "Neutral / Optimal (6.5 - 7.5)",
            "label_te": "తటస్థ / ఉత్తమ నేల (6.5 - 7.5)",
            "status_en": "Neutral",
            "status_te": "తటస్థం",
            "advice_en": "Ideal pH for maximal nutrient uptake and root vitality.",
            "advice_te": "పోషకాలు మొక్కకు పూర్తి స్థాయిలో అందడానికి ఇది అత్యుత్తమ pH స్థాయి."
        },
        "alkaline": {
            "min": 7.5,
            "label_en": "Alkaline (> 7.5)",
            "label_te": "క్షార నేల (> 7.5)",
            "status_en": "Alkaline",
            "status_te": "క్షార నేల",
            "advice_en": "Soil is alkaline. Apply Agricultural Gypsum and organic green manure (Dhaincha/Sunnhemp) to normalize.",
            "advice_te": "నేల క్షార గుణం కలిగి ఉంది. జిప్సం మరియు పచ్చిరొట్ట ఎరువులు (జీలుగ/జనుము) వేయండి."
        }
    }
}

# Ideal preferences for the 8 primary crops
CROP_NUTRIENT_PREFERENCES = {
    "rice": {
        "name_en": "Rice / Paddy",
        "name_te": "వరి",
        "ph_range": (5.5, 7.2),
        "preferred_n": "Medium to High",
        "preferred_p": "Medium",
        "preferred_k": "Medium",
        "fit_verdict_en": "Well suited for Rice (Paddy prefers slightly acidic to neutral soils with moderate to high N).",
        "fit_verdict_te": "వరి సాగుకు అనుకూలమైన నేల (వరికి స్వల్ప ఆమ్ల లేదా తటస్థ నేలలు అనుకూలం)."
    },
    "wheat": {
        "name_en": "Wheat",
        "name_te": "గోధుమ",
        "ph_range": (6.0, 7.5),
        "preferred_n": "Medium",
        "preferred_p": "Medium to High",
        "preferred_k": "Medium",
        "fit_verdict_en": "Well suited for Wheat.",
        "fit_verdict_te": "గోధుమ సాగుకు అనుకూలమైన నేల."
    },
    "cotton": {
        "name_en": "Cotton",
        "name_te": "పత్తి",
        "ph_range": (6.0, 8.0),
        "preferred_n": "Medium to High",
        "preferred_p": "Medium",
        "preferred_k": "High",
        "fit_verdict_en": "Well suited for Cotton (Cotton responds well to strong Potassium and Medium Nitrogen).",
        "fit_verdict_te": "పత్తి సాగుకు అనుకూలం (పత్తికి పొటాష్ మరియు నత్రజని కీలకం)."
    },
    "groundnut": {
        "name_en": "Groundnut",
        "name_te": "వేరుశనగ",
        "ph_range": (6.0, 7.5),
        "preferred_n": "Low to Medium",
        "preferred_p": "Medium to High",
        "preferred_k": "Medium",
        "fit_verdict_en": "Well suited for Groundnut (Legume crop fixes its own Nitrogen; ensures good Phosphorus for pod filling).",
        "fit_verdict_te": "వేరుశనగ సాగుకు అనుకూలం (రైజోబియం వల్ల నత్రజని స్వయంగా గ్రహిస్తుంది; ఊడలు దిగడానికి భాస్వరం ముఖ్యం)."
    },
    "maize": {
        "name_en": "Maize / Corn",
        "name_te": "మొక్కజొన్న",
        "ph_range": (5.8, 7.5),
        "preferred_n": "High",
        "preferred_p": "Medium",
        "preferred_k": "Medium to High",
        "fit_verdict_en": "Well suited for Maize (Maize is a heavy nutrient feeder requiring robust Nitrogen).",
        "fit_verdict_te": "మొక్కజొన్న సాగుకు అనుకూలం (మొక్కజొన్నకు ఎక్కువ నత్రజని మరియు పొటాష్ అవసరం)."
    },
    "sugarcane": {
        "name_en": "Sugarcane",
        "name_te": "చెరకు",
        "ph_range": (6.0, 7.8),
        "preferred_n": "High",
        "preferred_p": "Medium",
        "preferred_k": "High",
        "fit_verdict_en": "Well suited for Sugarcane (Requires high organic fertility and balanced N-K).",
        "fit_verdict_te": "చెరకు సాగుకు అనుకూలం (ఎక్కువ సేంద్రీయ ఎరువులు, నత్రజని మరియు పొటాష్ అవసరం)."
    },
    "chilli": {
        "name_en": "Chilli",
        "name_te": "మిరప",
        "ph_range": (6.0, 7.5),
        "preferred_n": "Medium to High",
        "preferred_p": "Medium",
        "preferred_k": "High",
        "fit_verdict_en": "Well suited for Chilli (Thrives in neutral soil with adequate Potash for pungent, firm pods).",
        "fit_verdict_te": "మిరప సాగుకు అనుకూలం (కాయ నాణ్యత మరియు రంగు కోసం తగినంత పొటాష్ అవసరం)."
    },
    "tomato": {
        "name_en": "Tomato",
        "name_te": "టమాటా",
        "ph_range": (6.0, 7.2),
        "preferred_n": "Medium",
        "preferred_p": "Medium to High",
        "preferred_k": "High",
        "fit_verdict_en": "Well suited for Tomato (Requires slightly acidic-neutral pH with high Potassium for fruit setting).",
        "fit_verdict_te": "టమాటా సాగుకు అనుకూలం (కాయ కట్టడానికి పొటాష్ మరియు భాస్వరం చాలా ముఖ్యం)."
    }
}


def analyze_soil_health(
    n: float,
    p: float,
    k: float,
    ph: float,
    crop_type: Optional[str] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    lang_code = "te" if lang == "te" else "en"

    # 1. Classify Nitrogen
    if n < 280.0:
        n_band = SOIL_NUTRIENT_RANGES["nitrogen"]["low"]
        n_key = "low"
    elif n <= 560.0:
        n_band = SOIL_NUTRIENT_RANGES["nitrogen"]["medium"]
        n_key = "medium"
    else:
        n_band = SOIL_NUTRIENT_RANGES["nitrogen"]["high"]
        n_key = "high"

    n_res = {
        "value": n,
        "unit": "kg/ha",
        "status": n_band[f"status_{lang_code}"],
        "label": n_band[f"label_{lang_code}"],
        "advice": n_band[f"advice_{lang_code}"],
        "band_key": n_key
    }

    # 2. Classify Phosphorus
    if p < 10.0:
        p_band = SOIL_NUTRIENT_RANGES["phosphorus"]["low"]
        p_key = "low"
    elif p <= 25.0:
        p_band = SOIL_NUTRIENT_RANGES["phosphorus"]["medium"]
        p_key = "medium"
    else:
        p_band = SOIL_NUTRIENT_RANGES["phosphorus"]["high"]
        p_key = "high"

    p_res = {
        "value": p,
        "unit": "kg/ha",
        "status": p_band[f"status_{lang_code}"],
        "label": p_band[f"label_{lang_code}"],
        "advice": p_band[f"advice_{lang_code}"],
        "band_key": p_key
    }

    # 3. Classify Potassium
    if k < 110.0:
        k_band = SOIL_NUTRIENT_RANGES["potassium"]["low"]
        k_key = "low"
    elif k <= 280.0:
        k_band = SOIL_NUTRIENT_RANGES["potassium"]["medium"]
        k_key = "medium"
    else:
        k_band = SOIL_NUTRIENT_RANGES["potassium"]["high"]
        k_key = "high"

    k_res = {
        "value": k,
        "unit": "kg/ha",
        "status": k_band[f"status_{lang_code}"],
        "label": k_band[f"label_{lang_code}"],
        "advice": k_band[f"advice_{lang_code}"],
        "band_key": k_key
    }

    # 4. Classify pH
    if ph < 6.5:
        ph_band = SOIL_NUTRIENT_RANGES["ph"]["acidic"]
        ph_key = "acidic"
    elif ph <= 7.5:
        ph_band = SOIL_NUTRIENT_RANGES["ph"]["neutral"]
        ph_key = "neutral"
    else:
        ph_band = SOIL_NUTRIENT_RANGES["ph"]["alkaline"]
        ph_key = "alkaline"

    ph_res = {
        "value": ph,
        "unit": "pH",
        "status": ph_band[f"status_{lang_code}"],
        "label": ph_band[f"label_{lang_code}"],
        "advice": ph_band[f"advice_{lang_code}"],
        "band_key": ph_key
    }

    # 5. Determine Specific Crop Suitability Fit (if provided)
    crop_fit = None
    crop_clean = crop_type.lower().strip() if crop_type else None
    if crop_clean and crop_clean in CROP_NUTRIENT_PREFERENCES:
        pref = CROP_NUTRIENT_PREFERENCES[crop_clean]
        min_ph, max_ph = pref["ph_range"]
        crop_name = pref[f"name_{lang_code}"]

        issues = []
        if ph < min_ph:
            issues.append(f"pH is too acidic for {crop_name} (needs {min_ph}-{max_ph})" if lang_code == "en" else f"pH స్థాయి {crop_name} కు చాలా ఆమ్లంగా ఉంది")
        elif ph > max_ph:
            issues.append(f"pH is too alkaline for {crop_name} (needs {min_ph}-{max_ph})" if lang_code == "en" else f"pH స్థాయి {crop_name} కు చాలా క్షారంగా ఉంది")

        if n_key == "low" and crop_clean != "groundnut":
            issues.append(f"Nitrogen is low for {crop_name} — consider extra Urea/compost" if lang_code == "en" else f"{crop_name} కోసం నత్రజని తక్కువగా ఉంది — యూరియా/సేంద్రీయ ఎరువు వేయండి")
        if p_key == "low":
            issues.append(f"Phosphorus is low — apply DAP at sowing" if lang_code == "en" else f"భాస్వరం తక్కువగా ఉంది — విత్తే సమయంలో DAP వేయండి")
        if k_key == "low" and crop_clean in ["cotton", "tomato", "chilli", "sugarcane"]:
            issues.append(f"Potash is low for {crop_name} — apply MOP" if lang_code == "en" else f"{crop_name} పంటకు పొటాష్ తక్కువగా ఉంది — MOP ఎరువు వేయండి")

        if not issues:
            crop_fit = {
                "is_well_suited": True,
                "verdict": pref[f"fit_verdict_{lang_code}"],
                "badge": "ఆదర్శవంతమైన నేల (Ideal Fit)" if lang_code == "te" else "Ideal Crop Fit"
            }
        else:
            crop_fit = {
                "is_well_suited": False,
                "verdict": ". ".join(issues) + ".",
                "badge": "సవరణలు అవసరం (Adjustments Needed)" if lang_code == "te" else "Adjustments Needed"
            }

    # 6. Synthesize High-Priority 1-2 Sentence Overall Summary
    summary_parts = []
    if ph_key != "neutral":
        if lang_code == "te":
            summary_parts.append(f"మీ నేల {ph_band['status_te']} గుణం కలిగి ఉంది ({ph_res['advice']})")
        else:
            summary_parts.append(f"Soil is {ph_band['status_en']} ({ph_res['advice']})")

    deficiencies = []
    if n_key == "low":
        deficiencies.append("నత్రజని (Nitrogen)" if lang_code == "te" else "Nitrogen")
    if p_key == "low":
        deficiencies.append("భాస్వరం (Phosphorus)" if lang_code == "te" else "Phosphorus")
    if k_key == "low":
        deficiencies.append("పొటాష్ (Potash)" if lang_code == "te" else "Potash")

    if deficiencies:
        if lang_code == "te":
            summary_parts.append(f"{', '.join(deficiencies)} లోపం ఉంది; విత్తే సమయంలో తగిన ఎరువులు అందించండి.")
        else:
            summary_parts.append(f"{', '.join(deficiencies)} is deficient; apply recommended basal fertilizer at sowing.")
    elif not summary_parts:
        if lang_code == "te":
            summary_parts.append("మీ నేల పోషకాలు సమతుల్యంగా, మంచి సారవంతంగా ఉన్నాయి.")
        else:
            summary_parts.append("Your soil nutrients and pH are well-balanced with good natural fertility.")

    overall_summary = " ".join(summary_parts)

    voice_text = overall_summary
    if crop_fit and not crop_fit["is_well_suited"]:
        voice_text += f" {crop_fit['verdict']}"

    disclaimer = (
        "మీరు నమోదు చేసిన సాయిల్ హెల్త్ కార్డ్ (Soil Health Card) వివరాల ఆధారంగా ఈ నివేదిక తయారు చేయబడింది. ఖచ్చితత్వం కోసం ప్రతి 2-3 సంవత్సరాలకు ఒకసారి నేల పరీక్ష చేయించుకోండి."
        if lang_code == "te"
        else "Based on your entered soil test values (e.g. from your Soil Health Card). Re-test soil every 2-3 years for optimal accuracy."
    )

    return {
        "nitrogen": n_res,
        "phosphorus": p_res,
        "potassium": k_res,
        "ph": ph_res,
        "crop_fit": crop_fit,
        "overall_summary": overall_summary,
        "voice_text": voice_text,
        "disclaimer": disclaimer,
        "is_soil_health": True
    }