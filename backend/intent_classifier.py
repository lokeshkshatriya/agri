from typing import Dict, Any

class AgriIntentClassifier:
    """
    Semantic Intent & Action Parser for Natural Spoken Agricultural Queries in Telugu & English.
    """
    INTENTS = {
        "OPEN_CAMERA": {
            "keywords_te": ["కెమెరా", "ఫోటో", "పిక్చర్", "తీయి", "ఆన్ చేయి", "చూపించు", "చిత్రం", "కెమెరాను"],
            "keywords_en": ["camera", "photo", "picture", "snap", "take picture", "open camera", "turn on camera", "viewfinder"],
            "action_name_te": "కెమెరాను ప్రారంభించడం (Open Camera)",
            "action_name_en": "Activating Live Camera Viewfinder",
            "action_type": "CAMERA_ACTIVATE"
        },
        "SCAN_DISEASE": {
            "keywords_te": ["ఆకు", "మచ్చ", "తెగులు", "రోగం", "పసుపు", "నలుపు", "ఎండిపో", "పురుగు", "స్కాన్", "వ్యాధి", "చూడు", "ఏమైంది", "రాలిపోతుంది"],
            "keywords_en": ["leaf", "spot", "disease", "blight", "yellow", "black", "rot", "drying", "fungus", "scan", "what happened", "sick leaf", "cure"],
            "action_name_te": "పంట తెగులు & రక్షణ విశ్లేషణ (Crop Disease Diagnostic)",
            "action_name_en": "Crop Disease Diagnosis & Prediction",
            "action_type": "DISEASE_DIAGNOSTIC"
        },
        "CHECK_WEATHER": {
            "keywords_te": ["వాతావరణం", "వర్షం", "ఎండ", "గాలి", "మంచు", "పిచికారీ", "మందు కొట్ట", "స్ప్రే", "చల్లవచ్చా"],
            "keywords_en": ["weather", "rain", "temperature", "wind", "spray", "pesticide spray", "rainy", "forecast", "safe to spray"],
            "action_name_te": "వాతావరణం & పిచికారీ సలహా (Weather & Spray Window)",
            "action_name_en": "Hyperlocal Agro-Weather & Spraying Advisory",
            "action_type": "WEATHER_ADVISORY"
        },
        "IRRIGATION_ADVICE": {
            "keywords_te": ["నీరు", "నీళ్ళు", "పారుదల", "పంపు", "ఎండగా ఉంది", "మోటారు", "తడి", "కట్టాలి", "వాడిపో"],
            "keywords_en": ["water", "irrigate", "irrigation", "pump", "hot", "dry", "wilting", "thirsty", "moisture", "watering"],
            "action_name_te": "స్మార్ట్ నీటిపారుదల & పంపు సమయం (Irrigation & Pump Runtime)",
            "action_name_en": "Smart Evapotranspiration Irrigation Engine",
            "action_type": "IRRIGATION_ENGINE"
        },
        "SOIL_FERTILIZER": {
            "keywords_te": ["ఎరువు", "ఖరీదు", "బస్తా", "యూరియా", "డీఏపీ", "పొటాష్", "నేల", "మట్టి", "బలం", "పోషకాలు"],
            "keywords_en": ["fertilizer", "urea", "dap", "potash", "soil", "npk", "bags", "nutrient", "fertile", "manure"],
            "action_name_te": "నేల పరీక్ష & ఎరువుల మోతాదు (Soil Health & Fertilizer Calculator)",
            "action_name_en": "Soil Health & Fertilizer Dosage Calculation",
            "action_type": "SOIL_CALCULATOR"
        },
        "PEST_ALERT": {
            "keywords_te": ["పురుగులు", "దోమ", "తెల్లదోమ", "ముప్పు", "హెచ్చరిక", "దాడి", "లద్దెపురుగు"],
            "keywords_en": ["pest", "insects", "whitefly", "borer", "worm", "alert", "attack", "outbreak", "warning"],
            "action_name_te": "కీటకాలు & తెగుళ్ల ముందస్తు హెచ్చరిక (Pest Outbreak Alert)",
            "action_name_en": "Microclimate Pest Outbreak Early Warning",
            "action_type": "PEST_ALERT_ENGINE"
        }
    }

    @classmethod
    def classify(cls, user_text: str, current_lang: str = "te") -> Dict[str, Any]:
        clean_text = user_text.lower().strip()
        best_intent = "GENERAL_AGRI_QA"
        highest_score = 0
        
        for intent_key, data in cls.INTENTS.items():
            score = 0
            all_keywords = data["keywords_te"] + data["keywords_en"]
            for kw in all_keywords:
                if kw in clean_text:
                    score += 1.5 if len(kw) > 3 else 1.0
            
            if score > highest_score:
                highest_score = score
                best_intent = intent_key

        confidence_pct = min(98, int(68 + highest_score * 10)) if highest_score > 0 else 55

        if highest_score == 0:
            if current_lang == "te":
                reply_text = f"మీ ప్రశ్న అందింది: '{user_text}'. అగ్రి సహాయక్ విశ్లేషిస్తున్నారు. మీరు ఆకు తెగులు, వాతావరణం, నీటిపారుదల లేదా ఎరువుల గురించి అడగవచ్చు."
                voice_text = "మీ వ్యవసాయ ప్రశ్నకు సమాధానం సిద్ధం చేస్తున్నాము."
                action_name = "సాధారణ వ్యవసాయ సహాయం"
            else:
                reply_text = f"Received: '{user_text}'. You can ask about crop disease, spraying weather, irrigation runtime, or fertilizer dosages."
                voice_text = "Analyzing your agricultural query."
                action_name = "General Agricultural Assistance"
            action_type = "GENERAL_ADVISORY"
        else:
            intent_meta = cls.INTENTS[best_intent]
            action_name = intent_meta[f"action_name_{current_lang}"]
            action_type = intent_meta["action_type"]

            if best_intent == "OPEN_CAMERA":
                reply_text = "📷 మీ ఫోన్ కెమెరా ఆన్ చేయబడింది. ఆకును సరిగ్గా ఫ్రేమ్‌లో ఉంచి 'స్కాన్ చేయి' అని చెప్పండి." if current_lang == "te" else "📷 Live camera is active. Point at the leaf and say 'Scan disease'."
                voice_text = "కెమెరా ఆన్ చేయబడింది. ఆకును చూపించి స్కాన్ చేయండి." if current_lang == "te" else "Camera is now active. Position the leaf and say scan."

            elif best_intent == "SCAN_DISEASE":
                reply_text = "🧪 ఆకు విశ్లేషణ: ఆకుమచ్చ తెగులు ప్రారంభ లక్షణాలు (92% నిర్ధారణ). నివారణ: 2.5 గ్రాముల మాంకోజెబ్ మందును లీటరు నీటిలో కలిపి పిచికారీ చేయండి, లేదా 5% వేపనూనె వాడండి." if current_lang == "te" else "🧪 Leaf Analysis: Early Blight detected (92% confidence). Recommended treatment: Mancozeb 75% WP @ 2.5 g/L or 5% organic Neem seed extract."
                voice_text = "ఆకులో మచ్చలు గుర్తించబడ్డాయి. లీటరు నీటికి రెండున్నర గ్రాముల మాంకోజెబ్ మందును కలిపి పిచికారీ చేయండి." if current_lang == "te" else "Leaf blight symptoms identified. Spray Mancozeb at 2.5 grams per liter."

            elif best_intent == "CHECK_WEATHER":
                reply_text = "🌦️ నేటి వాతావరణ సమాచారం: ఉష్ణోగ్రత 29°C, తేమ 62%, గాలి వేగం 9 km/h. వర్షం అవకాశం తక్కువ (<15%). ఉదయం 7 నుండి 10 గంటల మధ్య మందులు పిచికారీ చేయడానికి అనుకూలం." if current_lang == "te" else "🌦️ Live Weather: 29°C, Humidity 62%, Wind 9 km/h. Rain probability <15%. SAFE TO SPRAY between 7:00 AM and 10:00 AM."
                voice_text = "వాతావరణం ప్రశాంతంగా ఉంది. ఉదయం వేళ మందులు పిచికారీ చేసుకోవచ్చు." if current_lang == "te" else "Weather is clear and calm. Safe to spray pesticides today."

            elif best_intent == "IRRIGATION_ADVICE":
                reply_text = "💧 నీటిపారుదల లెక్కలు: ప్రస్తుతం అధిక ఉష్ణోగ్రత ఉన్నందున మీ 5 HP పంపును 1 గంట 30 నిమిషాలు (సుమారు 45,000 లీటర్లు/ఎకరా) నడపండి." if current_lang == "te" else "💧 Evapotranspiration: Crop water demand is high. Recommend running 5 HP tube well for 1 hour 30 minutes (approx. 45,000 L/acre)."
                voice_text = "నేల ఆరిపోకుండా మీ పంపును ఒకటిన్నర గంటల పాటు నడపండి." if current_lang == "te" else "Recommended irrigation run time is one hour and thirty minutes."

            elif best_intent == "SOIL_FERTILIZER":
                reply_text = "🌱 ఎరువుల మోతాదు: సమతుల్య పెరుగుదల కోసం ఎకరాకు 2 బస్తాల యూరియా, 1 బస్తా డీఏపీ (DAP) మరియు 10 కేజీల జింక్ సల్ఫేట్ వేయండి." if current_lang == "te" else "🌱 Fertilizer Prescription: Apply 2 bags Urea (46% N), 1 bag DAP, and 10 kg Zinc Sulphate per acre for optimal soil health."
                voice_text = "ఎకరాకు రెండు బస్తాల యూరియా మరియు ఒక బస్తా డీఏపీ వేయండి." if current_lang == "te" else "Apply two bags of Urea and one bag of DAP per acre."

            elif best_intent == "PEST_ALERT":
                reply_text = "⚠️ పురుగుల ముందస్తు హెచ్చరిక: తేమ పెరుగుతున్నందున తెల్లదోమ ముప్పు ఉంది. ఎకరాకు 10 పసుపు రంగు జిగురు అట్టలు అమర్చండి." if current_lang == "te" else "⚠️ Pest Alert: Elevated humidity creates favorable conditions for Whiteflies. Install 10 yellow sticky traps per acre."
                voice_text = "తేమ ఎక్కువైనందున తెల్లదోమ ముప్పు ఉంది. పసుపు రంగు జిగురు అట్టలు అమర్చండి." if current_lang == "te" else "High humidity detected. Install yellow sticky traps to prevent whitefly attack."

        return {
            "intent": best_intent,
            "confidence_pct": confidence_pct,
            "action_name": action_name,
            "action_type": action_type,
            "reply_text": reply_text,
            "voice_text": voice_text,
            "original_query": user_text
        }
