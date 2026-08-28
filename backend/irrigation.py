import os
import requests
from datetime import datetime, timedelta
from typing import Dict, Any

# Standard Agronomic Water Requirements (Typical Requirements cited in mm/week & sensitivity level)
CROP_WATER_NEEDS = {
    "rice": {
        "name_en": "Rice (Paddy)",
        "name_te": "వరి (Rice)",
        "sowing": {"mm_per_week": 45, "sensitivity": "high"},
        "vegetative": {"mm_per_week": 65, "sensitivity": "high"},
        "flowering": {"mm_per_week": 85, "sensitivity": "critical"},
        "harvest": {"mm_per_week": 20, "sensitivity": "low"}
    },
    "wheat": {
        "name_en": "Wheat",
        "name_te": "గోధుమ (Wheat)",
        "sowing": {"mm_per_week": 25, "sensitivity": "medium"},
        "vegetative": {"mm_per_week": 35, "sensitivity": "medium"},
        "flowering": {"mm_per_week": 50, "sensitivity": "critical"},
        "harvest": {"mm_per_week": 15, "sensitivity": "low"}
    },
    "cotton": {
        "name_en": "Cotton",
        "name_te": "పత్తి (Cotton)",
        "sowing": {"mm_per_week": 25, "sensitivity": "medium"},
        "vegetative": {"mm_per_week": 45, "sensitivity": "medium"},
        "flowering": {"mm_per_week": 60, "sensitivity": "high"},
        "harvest": {"mm_per_week": 15, "sensitivity": "low"}
    },
    "groundnut": {
        "name_en": "Groundnut / Peanut",
        "name_te": "వేరుశనగ (Groundnut)",
        "sowing": {"mm_per_week": 20, "sensitivity": "medium"},
        "vegetative": {"mm_per_week": 35, "sensitivity": "medium"},
        "flowering": {"mm_per_week": 50, "sensitivity": "critical"},
        "harvest": {"mm_per_week": 10, "sensitivity": "low"}
    },
    "maize": {
        "name_en": "Maize (Corn)",
        "name_te": "మొక్కజొన్న (Maize)",
        "sowing": {"mm_per_week": 25, "sensitivity": "medium"},
        "vegetative": {"mm_per_week": 40, "sensitivity": "medium"},
        "flowering": {"mm_per_week": 60, "sensitivity": "critical"},
        "harvest": {"mm_per_week": 20, "sensitivity": "low"}
    },
    "sugarcane": {
        "name_en": "Sugarcane",
        "name_te": "చెరకు (Sugarcane)",
        "sowing": {"mm_per_week": 35, "sensitivity": "high"},
        "vegetative": {"mm_per_week": 70, "sensitivity": "high"},
        "flowering": {"mm_per_week": 60, "sensitivity": "medium"},
        "harvest": {"mm_per_week": 25, "sensitivity": "low"}
    },
    "chilli": {
        "name_en": "Chilli (Mirchi)",
        "name_te": "మిరప (Chilli)",
        "sowing": {"mm_per_week": 25, "sensitivity": "medium"},
        "vegetative": {"mm_per_week": 35, "sensitivity": "high"},
        "flowering": {"mm_per_week": 50, "sensitivity": "critical"},
        "harvest": {"mm_per_week": 15, "sensitivity": "low"}
    },
    "tomato": {
        "name_en": "Tomato",
        "name_te": "టమాటా (Tomato)",
        "sowing": {"mm_per_week": 20, "sensitivity": "medium"},
        "vegetative": {"mm_per_week": 35, "sensitivity": "high"},
        "flowering": {"mm_per_week": 55, "sensitivity": "critical"},
        "harvest": {"mm_per_week": 20, "sensitivity": "low"}
    }
}

def get_irrigation_recommendation(lat: float, lon: float, crop_type: str, growth_stage: str, lang: str = "en") -> Dict[str, Any]:
    """
    Computes an agronomic irrigation recommendation based on OpenWeatherMap forecast data,
    crop water needs, and growth stage sensitivity.
    """
    crop_key = crop_type.lower().strip()
    stage_key = growth_stage.lower().strip()

    used_fallback_crop = crop_key not in CROP_WATER_NEEDS
    if used_fallback_crop:
        crop_key = "tomato"
    if stage_key not in ["sowing", "vegetative", "flowering", "harvest"]:
        stage_key = "vegetative"

    crop_info = CROP_WATER_NEEDS[crop_key]
    stage_info = crop_info.get(stage_key, crop_info["vegetative"])
    weekly_need_mm = stage_info["mm_per_week"]
    sensitivity = stage_info["sensitivity"]
    crop_name = crop_info[f"name_{lang}"] if f"name_{lang}" in crop_info else crop_info["name_en"]

    api_key = os.getenv("OPENWEATHER_API_KEY")
    weather_fetched = False
    forecast_rain_3d = 0.0
    recent_rain_48h = 0.0
    avg_temp = 28.0
    avg_humidity = 60.0

    # 1. Try OpenWeatherMap 5-day forecast
    if api_key and api_key != "your_openweather_api_key_here":
        try:
            url = "https://api.openweathermap.org/data/2.5/forecast"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": api_key,
                "units": "metric"
            }
            res = requests.get(url, params=params, timeout=6)
            if res.status_code == 200:
                data = res.json()
                forecast_list = data.get("list", [])
                
                # Extract first 24 entries (3 days: 8 intervals of 3h per day)
                temps = []
                humidities = []
                for entry in forecast_list[:24]:
                    main = entry.get("main", {})
                    if "temp" in main: temps.append(main["temp"])
                    if "humidity" in main: humidities.append(main["humidity"])
                    rain_info = entry.get("rain", {})
                    forecast_rain_3d += rain_info.get("3h", 0.0)

                if temps: avg_temp = sum(temps) / len(temps)
                if humidities: avg_humidity = sum(humidities) / len(humidities)
                weather_fetched = True
        except Exception as e:
            print(f"OpenWeatherMap request failed: {e}")

    # 2. Fallback to Open-Meteo (zero-key open access) if OpenWeatherMap key is unavailable
    if not weather_fetched:
        try:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "hourly": ["temperature_2m", "relative_humidity_2m", "precipitation"],
                "past_days": 2,
                "forecast_days": 3
            }
            res = requests.get(url, params=params, timeout=6)
            if res.status_code == 200:
                data = res.json()
                hourly = data.get("hourly", {})
                temps = hourly.get("temperature_2m", [])
                humidities = hourly.get("relative_humidity_2m", [])
                precips = hourly.get("precipitation", [])

                # 48 past hours (2 days)
                if len(precips) >= 48:
                    recent_rain_48h = sum(precips[:48])
                    # next 72 forecast hours (3 days)
                    forecast_rain_3d = sum(precips[48:120])
                
                if temps: avg_temp = sum(temps[-72:]) / max(1, len(temps[-72:]))
                if humidities: avg_humidity = sum(humidities[-72:]) / max(1, len(humidities[-72:]))
                weather_fetched = True
        except Exception as e:
            print(f"Open-Meteo fallback request failed: {e}")

    # 3. Final Fallback (If weather APIs are unreachable)
    if not weather_fetched:
        next_check = (datetime.now() + timedelta(days=3)).strftime("%d %b %Y")
        fallback_note_en = f" (Note: '{crop_type}' isn't in our crop database yet, showing Tomato as the closest reference.)" if used_fallback_crop else ""
        fallback_note_te = f" (గమనిక: '{crop_type}' మా డేటాబేస్లో లేదు, టమాటా డేటాను సూచనగా చూపిస్తున్నాం.)" if used_fallback_crop else ""
        return {
            "crop_type": crop_name,
            "growth_stage": stage_key.capitalize(),
            "recommendation": "Maintain standard regional schedule" if lang == "en" else "సాధారణ పద్ధతి ప్రకారం నీరు పెట్టండి",
            "reason": (f"Typical water requirement for {crop_name} during {stage_key} stage is ~{weekly_need_mm} mm/week. If soil is dry, provide light irrigation." if lang == "en" else f"{crop_name} పంట {stage_key} దశలో వారానికి ~{weekly_need_mm} మి.మీ నీరు అవసరం. నేల తేమను బట్టి నీరు పెట్టండి.") + (fallback_note_te if lang == "te" else fallback_note_en),
            "next_check_date": next_check,
            "rainfall_expected_mm": 0.0,
            "confidence": "estimate based on regional agronomic baseline (weather service unreachable)",
            "used_fallback_crop": used_fallback_crop,
            "voice_text": (f"Weather service is unreachable. {crop_name} needs about {weekly_need_mm} millimeters of water per week." if lang == "en" else f"{crop_name} పంటకు వారానికి దాదాపు {weekly_need_mm} మిల్లీమీటర్ల నీరు అవసరం.") + (fallback_note_te if lang == "te" else fallback_note_en)
        }

    # 4. Irrigation Decision Logic
    today = datetime.now()
    daily_crop_need = weekly_need_mm / 7.0

    # Rule A: Significant rain forecasted (> 15mm or > 60% of weekly need)
    if forecast_rain_3d >= max(12.0, weekly_need_mm * 0.4):
        recommendation_en = "Skip irrigation, rain expected"
        recommendation_te = "నీరు పెట్టవద్దు, త్వరలో వర్షం కురిసే అవకాశం ఉంది"
        reason_en = f"Forecast indicates {forecast_rain_3d:.1f} mm of rainfall over the next 3 days, which meets the {crop_name} water demand ({weekly_need_mm} mm/week)."
        reason_te = f"రాబోయే 3 రోజుల్లో {forecast_rain_3d:.1f} మి.మీ వర్షం కురిసే అవకాశం ఉంది. ఇది {crop_name} పంట అవసరానికి సరిపోతుంది."
        next_check = (today + timedelta(days=3)).strftime("%d %b %Y")

    # Rule B: Recent rainfall already met > 70% of weekly need
    elif recent_rain_48h >= (weekly_need_mm * 0.7):
        recommendation_en = "Skip, sufficient recent rainfall"
        recommendation_te = "నీరు పెట్టవద్దు, ఇటీవల తగినంత వర్షపాతం నమోదైంది"
        reason_en = f"Recent rainfall of {recent_rain_48h:.1f} mm has sufficiently replenished the root zone moisture for {crop_name} ({stage_key} stage)."
        reason_te = f"గత 48 గంటల్లో {recent_rain_48h:.1f} మి.మీ వర్షం పడింది. నేలలో తగినంత తేమ ఉంది."
        next_check = (today + timedelta(days=2)).strftime("%d %b %Y")

    # Rule C: High evapotranspiration (Temp > 32°C, Humidity < 55%) and no rain
    elif avg_temp >= 32.0 and avg_humidity <= 55.0 and forecast_rain_3d < 4.0:
        recommendation_en = "Irrigate today / tomorrow (High Evaporative Stress)"
        recommendation_te = "ఈరోజు లేదా రేపు నీరు పెట్టండి (అధిక ఉష్ణోగ్రత)"
        reason_en = f"High temperature ({avg_temp:.1f}°C) and dry air ({avg_humidity:.0f}% humidity) are causing rapid soil moisture depletion for {crop_name} in its {stage_key} stage."
        reason_te = f"అధిక ఉష్ణోగ్రత ({avg_temp:.1f}°C) మరియు తక్కువ తేమ వల్ల నేల త్వరగా ఎండిపోతోంది. {crop_name} పంటకు నీరు అవసరం."
        next_check = (today + timedelta(days=1)).strftime("%d %b %Y")

    # Rule D: Moderate condition -> Estimate days until next irrigation
    else:
        # Estimate how many days of "moisture buffer" remain: how much of the
        # weekly need is still unmet after recent rain, divided by daily need,
        # then nudged by any rain forecast in the next 3 days.
        unmet_mm = max(0.0, weekly_need_mm - recent_rain_48h)
        raw_days = unmet_mm / max(1.0, daily_crop_need)
        # Light forecast rain buys a bit more time before irrigation is needed
        if forecast_rain_3d > 0:
            raw_days += (forecast_rain_3d / max(1.0, daily_crop_need)) * 0.5
        days_estimate = max(1, min(6, round(raw_days)))
        recommendation_en = f"Irrigate in {days_estimate} days"
        recommendation_te = f"{days_estimate} రోజుల తర్వాత నీరు పెట్టండి"
        reason_en = f"{crop_name} in {stage_key} stage has a typical requirement of {weekly_need_mm} mm/week (sensitivity: {sensitivity}). Light rain ({forecast_rain_3d:.1f} mm) is expected."
        reason_te = f"{crop_name} పంట {stage_key} దశకు వారానికి దాదాపు {weekly_need_mm} మి.మీ నీరు అవసరం. రాబోయే రోజుల్లో {forecast_rain_3d:.1f} మి.మీ స్వల్ప వర్షం అంచనా."
        next_check = (today + timedelta(days=days_estimate)).strftime("%d %b %Y")

    rec_text = recommendation_te if lang == "te" else recommendation_en
    reason_text = reason_te if lang == "te" else reason_en

    fallback_note_en = f" (Note: '{crop_type}' isn't in our crop database yet, showing Tomato as the closest reference.)" if used_fallback_crop else ""
    fallback_note_te = f" (గమనిక: '{crop_type}' మా డేటాబేస్లో లేదు, టమాటా డేటాను సూచనగా చూపిస్తున్నాం.)" if used_fallback_crop else ""
    
    if lang == "te":
        voice_text = f"{crop_name} పంటకు నీటిపారుదల సలహా: {rec_text}. {reason_text}{fallback_note_te}"
    else:
        voice_text = f"Irrigation advice for {crop_name}: {rec_text}. {reason_text}{fallback_note_en}"

    return {
        "crop_type": crop_name,
        "growth_stage": stage_key.capitalize(),
        "recommendation": rec_text,
        "reason": reason_text + (fallback_note_te if lang == "te" else fallback_note_en),
        "next_check_date": next_check,
        "rainfall_expected_mm": round(forecast_rain_3d, 1),
        "confidence": "estimate based on regional weather data & typical crop requirements",
        "used_fallback_crop": used_fallback_crop,
        "voice_text": voice_text
    }
