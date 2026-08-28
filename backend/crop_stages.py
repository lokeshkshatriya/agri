from typing import Dict, Any, List

# Stage normalization mapping
STAGE_MAPPINGS = {
    "just planted": "Just planted",
    "growing": "Growing (leaves & stem)",
    "growing (leaves & stem)": "Growing (leaves & stem)",
    "flowering": "Flowering",
    "fruit/grain forming": "Fruit/grain forming",
    "almost ready to harvest": "Almost ready to harvest"
}

CROP_STAGE_RISKS = {
    "tomato": {
        "Just planted": [
            {
                "risk_name_en": "Seedling Damping-Off (Rotting at Soil Line)",
                "risk_name_te": "మొక్క మొదలు కుళ్లు తెగులు (Damping-Off)",
                "what_to_look_for_en": "Young stems turning soft, dark, and collapsing right at the soil surface.",
                "what_to_look_for_te": "నేల దగ్గర మొక్క కాండం నల్లగా మెత్తబడి పడిపోవడం.",
                "action_en": "Avoid over-watering. Drench soil base with Trichoderma (10g/L) or Copper Oxychloride (2.5g/L).",
                "action_te": "ఎక్కువ నీరు పెట్టకండి. మొక్క మొదట్లో ట్రైకోడెర్మా లేదా కాపర్ ఆక్సిక్లోరైడ్ ద్రావణం పోయండి."
            }
        ],
        "Growing (leaves & stem)": [
            {
                "risk_name_en": "Early Blight & Whitefly Vector Attack",
                "risk_name_te": "ఆకుమచ్చ తెగులు మరియు తెల్లదోమ ముప్పు",
                "what_to_look_for_en": "Dark circular spots with yellow borders on lower leaves; tiny white flies flying when shaking plants.",
                "what_to_look_for_te": "కింది ఆకులపై వలయాల వంటి మచ్చలు; మొక్కను కదిలిస్తే చిన్న తెల్లదోమలు ఎగరడం.",
                "action_en": "Install 12 yellow sticky traps per acre. Spray Neem oil (5ml/L) or Mancozeb (2.5g/L).",
                "action_te": "ఎకరాకు 12 పసుపు జిగురు అట్టలు పెట్టండి. వేపనూనె లేదా మాంకోజెబ్ పిచికారీ చేయండి."
            }
        ],
        "Flowering": [
            {
                "risk_name_en": "Flower Drop & Leaf Curl Risk",
                "risk_name_te": "పూత రాలడం మరియు ఆకు ముడత వైరస్",
                "what_to_look_for_en": "Flowers turning yellow and dropping without setting fruit; leaves curling tightly upward.",
                "what_to_look_for_te": "పూత పసుపు రంగులోకి మారి రాలిపోవడం; ఆకులు పైకి ముడుచుకుపోవడం.",
                "action_en": "Spray Planofix (0.25ml/4.5L water) to retain flowers. Keep soil evenly moist, never waterlogged.",
                "action_te": "పూత రాలకుండా ప్లానోఫిక్స్ పిచికారీ చేయండి. నేలలో సమానమైన తేమను ఉంచండి."
            }
        ],
        "Fruit/grain forming": [
            {
                "risk_name_en": "Fruit Borer Caterpillars & Blossom End Rot",
                "risk_name_te": "కాయ తొలుచు పురుగు మరియు కాయ కుళ్లు",
                "what_to_look_for_en": "Small circular holes drilled into green fruits with caterpillar droppings; black flattened fruit bottoms.",
                "what_to_look_for_te": "పచ్చి కాయలపై రంధ్రాలు ఉండటం; కాయ అడుగు భాగం నల్లగా మారడం.",
                "action_en": "Install 6 pheromone traps per acre. Spray Bacillus thuringiensis (Bt @ 2g/L) or Emamectin Benzoate (0.5g/L).",
                "action_te": "ఎకరాకు 6 లింగాకర్షక బుట్టలు పెట్టండి. ఇమామెక్టిన్ బెంజోయేట్ 0.5 గ్రా/లీ పిచికారీ చేయండి."
            }
        ],
        "Almost ready to harvest": [
            {
                "risk_name_en": "Late Fruit Rot & Cracking",
                "risk_name_te": "పండు కుళ్లు మరియు కాయ పగుళ్లు",
                "what_to_look_for_en": "Soft watery patches on ripening tomatoes; radial skin splitting after heavy rains.",
                "what_to_look_for_te": "పండిన టమాటాలపై మెత్తటి నీటి మచ్చలు; అధిక వర్షం వల్ల కాయలు పగలడం.",
                "action_en": "Harvest fruits at breaker (turning pink) stage. Stop irrigation 3 days before picking.",
                "action_te": "లేత ఎరుపు రంగులోకి రాగానే కోయండి. కోతకు 3 రోజుల ముందు నీరు పెట్టడం ఆపండి."
            }
        ]
    },
    "rice": {
        "Just planted": [
            {
                "risk_name_en": "Poor Root Establishment & Snail Damage",
                "risk_name_te": "మొక్క వేరు కుదురుకోకపోవడం మరియు నత్తల ముప్పు",
                "what_to_look_for_en": "Yellow floating seedlings with eaten stems near water level.",
                "what_to_look_for_te": "నీటి మట్టం వద్ద లేత నారు తెగి తేలియాడడం.",
                "action_en": "Maintain shallow 2cm water depth. Do not allow standing water to exceed 5cm in first week.",
                "action_te": "మొదటి వారం పొలంలో కేవలం 2 సెం.మీ నీరు మాత్రమే ఉంచండి. ఎక్కువ నీరు నిల్వ ఉంచవద్దు."
            }
        ],
        "Growing (leaves & stem)": [
            {
                "risk_name_en": "Stem Borer (Dead Heart)",
                "risk_name_te": "కాండం తొలుచు పురుగు (Dead Heart)",
                "what_to_look_for_en": "Central young shoot drying up and turning brown ('dead heart'); easily pulls out by hand.",
                "what_to_look_for_te": "మొక్క నడిమొగ్గ ఎండిపోయి పైకి లాగితే సులభంగా వచ్చేయడం.",
                "action_en": "Install 8 light traps per acre. Apply Chlorantraniliprole 0.4% G (4kg/acre) in standing water.",
                "action_te": "ఎకరాకు 8 లైట్ ట్రాప్స్ పెట్టండి లేదా కొరాజెన్ గుళికలను చల్లండి."
            }
        ],
        "Flowering": [
            {
                "risk_name_en": "Rice Blast & False Smut Risk",
                "risk_name_te": "అగ్గితెగులు (Blast) మరియు కాటుక తెగులు",
                "what_to_look_for_en": "Spindle-shaped brown eye spots on leaves; neck nodes turning dark brown.",
                "what_to_look_for_te": "ఆకులపై కంటి ఆకారపు గోధుమ మచ్చలు మరియు మెడ విరుపు లక్షణాలు.",
                "action_en": "Avoid excess Urea fertilizer. Spray Tricyclazole 75% WP @ 0.6g/L immediately.",
                "action_te": "యూరియా వాడకం తగ్గించండి. ట్రైసైక్లజోల్ 0.6 గ్రా/లీ నీటిలో కలిపి పిచికారీ చేయండి."
            }
        ],
        "Fruit/grain forming": [
            {
                "risk_name_en": "White Earhead & Gundhi Bug",
                "risk_name_te": "తెల్ల కంకి మరియు గంధి నల్లి పురుగు",
                "what_to_look_for_en": "Completely white chaffy earheads standing erect; bad odor from milk-stage grains.",
                "what_to_look_for_te": "కంకులు తెల్లగా మారి గింజ పాలు పోసుకోకపోవడం; పొలంలో దుర్వాసన రావడం.",
                "action_en": "Dust Malathion 5% DP @ 10kg/acre during early morning hours.",
                "action_te": "ఉదయం పూట మలాథియాన్ పొడిని ఎకరాకు 10 కేజీలు చల్లండి."
            }
        ],
        "Almost ready to harvest": [
            {
                "risk_name_en": "Lodging & Pre-Harvest Grain Shattering",
                "risk_name_te": "పంట నేలకొరగడం మరియు గింజ రాలడం",
                "what_to_look_for_en": "Heavy panicles leaning over due to waterlogged muddy soil.",
                "what_to_look_for_te": "నేలలో అధిక తేమ వల్ల బరువైన కంకులు నేలకొరగడం.",
                "action_en": "Drain all field water 10 days before harvesting to harden soil for harvesters.",
                "action_te": "కోతకు 10 రోజుల ముందే పొలంలో నుంచి నీటిని పూర్తిగా తీసివేయండి."
            }
        ]
    },
    "chilli": {
        "Just planted": [
            {
                "risk_name_en": "Seedling Wilt & Root Rot",
                "risk_name_te": "నారు కుళ్లు మరియు ఎండు తెగులు",
                "what_to_look_for_en": "Young chilli plants suddenly wilting in patches during midday sun.",
                "what_to_look_for_te": "మధ్యాహ్నం ఎండలో లేత మొక్కలు ఉన్నట్టుండి వడలిపోవడం.",
                "action_en": "Drench root zone with Copper Oxychloride 50% WP (3g/L).",
                "action_te": "కాపర్ ఆక్సిక్లోరైడ్ 3 గ్రాములు లీటరు నీటికి కలిపి మొక్కల మొదళ్లలో పోయండి."
            }
        ],
        "Growing (leaves & stem)": [
            {
                "risk_name_en": "Thrips & Mites (Leaf Curling / Murda)",
                "risk_name_te": "తామర పురుగులు & నల్లి (బొబ్బర / ముడత తెగులు)",
                "what_to_look_for_en": "Leaves curling upward like boat shape (Thrips) or downward like inverted cup (Mites).",
                "what_to_look_for_te": "ఆకులు పైకి దోనెలా ముడుచుకుపోవడం లేదా కిందికి ముడుచుకోవడం.",
                "action_en": "Install 20 blue & yellow sticky traps. Spray Diafenthiuron 50% WP (1.2g/L) or Spiromesifen (1ml/L).",
                "action_te": "నీలం మరియు పసుపు జిగురు అట్టలు పెట్టండి. డయాఫెంథియురాన్ లేదా స్పైరోమెసిఫెన్ పిచికారీ చేయండి."
            }
        ],
        "Flowering": [
            {
                "risk_name_en": "Flower Drop & Powdery Mildew",
                "risk_name_te": "పూత రాలడం మరియు బూడిద తెగులు",
                "what_to_look_for_en": "White powdery patches underneath leaves; flowers falling off.",
                "what_to_look_for_te": "ఆకుల కింది భాగంలో తెల్లటి బూడిద పొర; పూత రాలిపోవడం.",
                "action_en": "Spray Wettable Sulphur 80% WP @ 2.5g/L or Azoxystrobin (1ml/L).",
                "action_te": "సల్ఫర్ 2.5 గ్రా/లీ లేదా అజోక్సిస్ట్రోబిన్ 1 మి.లీ/లీ పిచికారీ చేయండి."
            }
        ],
        "Fruit/grain forming": [
            {
                "risk_name_en": "Anthracnose Fruit Rot (Die-back)",
                "risk_name_te": "కాయ కుళ్లు తెగులు (ఆంథ్రాక్నోస్)",
                "what_to_look_for_en": "Circular sunken spots on ripe and green chillies with black concentric dots.",
                "what_to_look_for_te": "పచ్చి మరియు పండు మిరపకాయలపై నల్లటి గుండ్రని మచ్చలు ఏర్పడి కుళ్లిపోవడం.",
                "action_en": "Spray Propiconazole 25% EC (1ml/L) or Azoxystrobin + Difenoconazole (1ml/L).",
                "action_te": "ప్రొపికోనజోల్ 1 మి.లీ లేదా కస్టోడియా 1 మి.లీ లీటరు నీటికి కలిపి పిచికారీ చేయండి."
            }
        ],
        "Almost ready to harvest": [
            {
                "risk_name_en": "Post-Harvest Drying Mold Risk",
                "risk_name_te": "ఎండబెట్టే సమయంలో బూజు తెగులు",
                "what_to_look_for_en": "Moisture accumulation causing white fungal mold on drying chilli pods.",
                "what_to_look_for_te": "కళ్ళాల్లో ఆరబెట్టినప్పుడు తేమ వల్ల మిరపకాయలు బూజు పట్టడం.",
                "action_en": "Dry on clean tarpaulins under direct sun; turn pods twice daily to ensure uniform drying.",
                "action_te": "టార్పాలిన్ పట్టాలపై మాత్రమే ఆరబెట్టండి. రోజుకు రెండుసార్లు తిరగేయండి."
            }
        ]
    },
    "cotton": {
        "Just planted": [
            {
                "risk_name_en": "Stem & Root Rot in Heavy Soils",
                "risk_name_te": "మొలక కుళ్లు మరియు వేరు తెగులు",
                "what_to_look_for_en": "Seedlings failing to emerge or turning black at soil level.",
                "what_to_look_for_te": "విత్తనాలు మొలకెత్తకపోవడం లేదా మొలక నల్లగా మారిపోవడం.",
                "action_en": "Ensure proper field drainage. Drench with Carbendazim 50% WP (1g/L).",
                "action_te": "నీటి పారుదల సౌకర్యం సరిగ్గా ఉండాలి. కార్బండజిమ్ 1 గ్రా/లీ ద్రావణం పోయండి."
            }
        ],
        "Growing (leaves & stem)": [
            {
                "risk_name_en": "Sucking Pests (Aphids & Jassids)",
                "risk_name_te": "రసం పీల్చే పురుగులు (పేనుబంక & పచ్చదోమ)",
                "what_to_look_for_en": "Leaf edges turning yellow and curling downward like a cup; shiny sticky honeydew.",
                "what_to_look_for_te": "ఆకుల అంచులు పసుపుగా మారి కిందికి ముడతలు పడటం; జిగురు పదార్థం ఉండటం.",
                "action_en": "Apply Neem seed kernel extract (5%) or Flonicamid 50% WG @ 0.3g/L.",
                "action_te": "వేప గింజల కషాయం 5% లేదా ఫ్లోనికామిడ్ 0.3 గ్రా/లీ పిచికారీ చేయండి."
            }
        ],
        "Flowering": [
            {
                "risk_name_en": "Square & Flower Drop (Bollworm Entry)",
                "risk_name_te": "గుడ్డి పూత రాలడం మరియు కాయ తొలుచు పురుగు",
                "what_to_look_for_en": "Flower buds (squares) opening prematurely (flared-up squares) and falling off.",
                "what_to_look_for_te": "పూత మొగ్గలు విచ్చుకుని పసుపు రంగులోకి మారి రాలిపోవడం.",
                "action_en": "Install 5 pink bollworm pheromone traps per acre. Spray Profenophos 50% EC (2ml/L).",
                "action_te": "ఎకరాకు 5 లింగాకర్షక బుట్టలు పెట్టండి. ప్రొఫెనోఫాస్ 2 మి.లీ/లీ పిచికారీ చేయండి."
            }
        ],
        "Fruit/grain forming": [
            {
                "risk_name_en": "Pink Bollworm Internal Damage",
                "risk_name_te": "గులాబీ రంగు కాయ తొలుచు పురుగు (Pink Bollworm)",
                "what_to_look_for_en": "Small entry holes in green bolls with rosette flowers that fail to open normally.",
                "what_to_look_for_te": "కాయలపై చిన్న రంధ్రాలు ఉండటం మరియు పువ్వులు గులాబీలా ముడుచుకుపోవడం.",
                "action_en": "Destroy rosette flowers manually. Spray Emamectin Benzoate 5% SG (0.5g/L).",
                "action_te": "ముడుచుకున్న పువ్వులను ఏరి నాశనం చేయండి. ఇమామెక్టిన్ బెంజోయేట్ పిచికారీ చేయండి."
            }
        ],
        "Almost ready to harvest": [
            {
                "risk_name_en": "Boll Rot & Stained Lint Risk",
                "risk_name_te": "కాయ కుళ్లు మరియు పత్తి నాణ్యత తగ్గడం",
                "what_to_look_for_en": "Blackened unopened bolls with stained, discolored cotton lint inside.",
                "what_to_look_for_te": "పత్తి కాయలు నల్లగా మారి పత్తి పసుపు/గోధుమ రంగులోకి మారడం.",
                "action_en": "Pick only fully opened dry bolls on sunny mornings. Store in dry, moisture-free gunny bags.",
                "action_te": "బాగా విచ్చుకున్న తెల్లటి పత్తిని మాత్రమే ఎండలో తీయండి. తేమ లేని ప్రదేశంలో నిల్వ చేయండి."
            }
        ]
    },
    "groundnut": {
        "Just planted": [
            {
                "risk_name_en": "Collar Rot & Seedling Blight",
                "risk_name_te": "మొదలు కుళ్లు తెగులు (Collar Rot)",
                "what_to_look_for_en": "Seedlings rotting at ground level covered with black sooty mold.",
                "what_to_look_for_te": "భూమి మట్టం వద్ద మొలక నల్లగా బూజు పట్టి కుళ్లిపోవడం.",
                "action_en": "Avoid water stagnant patches. Drench with Mancozeb (2.5g/L).",
                "action_te": "పొలంలో నీరు నిల్వ ఉండకుండా చూడండి. మాంకోజెబ్ ద్రావణం పోయండి."
            }
        ],
        "Growing (leaves & stem)": [
            {
                "risk_name_en": "Tikka Leaf Spot (Early & Late Spot)",
                "risk_name_te": "టిక్కా ఆకుమచ్చ తెగులు (Tikka Disease)",
                "what_to_look_for_en": "Dark brown circular spots on leaves with bright yellow halos.",
                "what_to_look_for_te": "ఆకులపై పసుపు రంగు వలయంతో కూడిన నల్లటి మచ్చలు ఏర్పడటం.",
                "action_en": "Spray Carbendazim + Mancozeb (SAAF @ 2g/L) or Hexaconazole (1.5ml/L).",
                "action_te": "సాఫ్ (SAAF) 2 గ్రా/లీ లేదా హెక్సాకోనజోల్ 1.5 మి.లీ/లీ పిచికారీ చేయండి."
            }
        ],
        "Flowering": [
            {
                "risk_name_en": "Soil Hardening (Peg Penetration Failure)",
                "risk_name_te": "నేల గట్టిపడటం (ఊడలు భూమిలోకి దిగకపోవడం)",
                "what_to_look_for_en": "Flowering pegs remaining above dry hard soil without burying inside.",
                "what_to_look_for_te": "నేల గట్టిగా ఉండటం వల్ల ఊడలు భూమిలోకి దిగలేకపోవడం.",
                "action_en": "Provide light irrigation to keep topsoil soft for smooth peg penetration.",
                "action_te": "ఊడలు సులభంగా దిగడానికి నేల మెత్తగా ఉండేలా తేలికపాటి నీటి తడి ఇవ్వండి."
            }
        ],
        "Fruit/grain forming": [
            {
                "risk_name_en": "Pod Borer & White Grub Root Attack",
                "risk_name_te": "కాయ తొలుచు పురుగు మరియు తెల్ల వేరు పురుగు",
                "what_to_look_for_en": "Plants wilting in circles; underground pods with bored holes.",
                "what_to_look_for_te": "పొలంలో అక్కడక్కడా మొక్కలు ఎండిపోవడం; భూమిలోని కాయలకు రంధ్రాలు పడటం.",
                "action_en": "Drench soil with Chlorpyrifos 20% EC (2ml/L) along with irrigation water.",
                "action_te": "నీటితో పాటు క్లోరిపైరిఫాస్ 2 మి.లీ/లీ భూమిలో కలిసేలా అందించండి."
            }
        ],
        "Almost ready to harvest": [
            {
                "risk_name_en": "Aflatoxin Mold Risk (Over-Maturing in Wet Soil)",
                "risk_name_te": "అఫ్లాటాక్సిన్ బూజు ముప్పు (Aflatoxin)",
                "what_to_look_for_en": "Pods turning dark greenish-black with moldy smell if left unharvested.",
                "what_to_look_for_te": "కాయల లోపలి భాగంలో నల్లటి లేదా ఆకుపచ్చని బూజు ఏర్పడటం.",
                "action_en": "Harvest when inner pod shell turns dark brown. Dry pods to below 8% moisture.",
                "action_te": "కాయ లోపలి పొర గోధుమ రంగులోకి రాగానే పీకండి. ఎండలో బాగా ఆరబెట్టండి."
            }
        ]
    },
    "maize": {
        "Just planted": [
            {
                "risk_name_en": "Shoot Fly Attack",
                "risk_name_te": "మొలక ఈగ తెగులు (Shoot Fly)",
                "what_to_look_for_en": "Young seedlings drying up at central whorl with rotting smell.",
                "what_to_look_for_te": "లేత మొలక నడిమొగ్గ ఎండిపోయి కుళ్లిపోవడం.",
                "action_en": "Spray Chlorpyrifos 20% EC @ 2ml/L or apply Thiamethoxam seed care.",
                "action_te": "క్లోరిపైరిఫాస్ 2 మి.లీ లీటరు నీటికి కలిపి పిచికారీ చేయండి."
            }
        ],
        "Growing (leaves & stem)": [
            {
                "risk_name_en": "Fall Armyworm (FAW / కత్తెర పురుగు)",
                "risk_name_te": "కత్తెర పురుగు (Fall Armyworm - FAW)",
                "what_to_look_for_en": "Shot-holes on leaves and sawdust-like yellowish frass inside central leaf whorls.",
                "what_to_look_for_te": "ఆకులపై రంధ్రాలు మరియు సుడి లోపల రంపపు పొట్టు లాంటి పురుగు మలం ఉండటం.",
                "action_en": "Apply sand + lime (9:1) mixture into whorls or spray Emamectin Benzoate 5% SG (0.4g/L).",
                "action_te": "సుడిలో ఇసుక+సున్నం మిశ్రమం వేయండి లేదా ఇమామెక్టిన్ బెంజోయేట్ సుడి తడిచేలా పిచికారీ చేయండి."
            }
        ],
        "Flowering": [
            {
                "risk_name_en": "Tassel & Silk Drying (Moisture Stress)",
                "risk_name_te": "పూత మరియు పీచు ఎండిపోవడం",
                "what_to_look_for_en": "Pollen tassels drying out prematurely before silks are pollinated.",
                "what_to_look_for_te": "పీచు కట్టకముందే మగ పూత ఎండిపోవడం.",
                "action_en": "Flowering is the most moisture-critical stage in maize. Do NOT allow water stress.",
                "action_te": "మొక్కజొన్నలో పూత సమయం అత్యంత కీలకమైనది. తప్పనిసరిగా నీటి తడి ఇవ్వండి."
            }
        ],
        "Fruit/grain forming": [
            {
                "risk_name_en": "Corn Earworm Boring into Cob Tips",
                "risk_name_te": "కంకి పురుగు (Corn Earworm)",
                "what_to_look_for_en": "Brown feeding holes at the tip of the maize cob under the green husk.",
                "what_to_look_for_te": "కంకి కొన భాగంలో రంధ్రాలు పడి గింజలు నాశనం కావడం.",
                "action_en": "Spray Spinetoram 11.7% SC @ 0.5ml/L directly directed towards cobs.",
                "action_te": "స్పైనెటోరమ్ 0.5 మి.లీ లీటరు నీటికి కలిపి కంకెలపై పిచికారీ చేయండి."
            }
        ],
        "Almost ready to harvest": [
            {
                "risk_name_en": "Stalk Rot & Bird Damage",
                "risk_name_te": "కాండం కుళ్లు మరియు పక్షుల బెడద",
                "what_to_look_for_en": "Lower stalk becoming spongy and collapsing; cobs opened by birds.",
                "what_to_look_for_te": "మొక్క మొదలు మెత్తబడి పడిపోవడం; పక్షులు కంకెలపై దాడి చేయడం.",
                "action_en": "Harvest as soon as black layer forms at grain tip base. Protect field with reflective ribbons.",
                "action_te": "గింజ కొనపై నల్లటి చుక్క ఏర్పడగానే కోయండి. పక్షుల నివారణకు రిఫ్లెక్టివ్ రిబ్బన్లు కట్టండి."
            }
        ]
    },
    "sugarcane": {
        "Just planted": [
            {
                "risk_name_en": "Termites & Poor Sett Germination",
                "risk_name_te": "చెదపురుగులు మరియు మొలక సరిగ్గా రాకపోవడం",
                "what_to_look_for_en": "Planted cane setts hollowed out from inside with soil tunnels.",
                "what_to_look_for_te": "నాటిన చెరకు ముక్కలను లోపలి నుంచి చెదలు తినేయడం.",
                "action_en": "Drench furrows with Chlorpyrifos 20% EC (2ml/L) over the setts before covering with soil.",
                "action_te": "ముక్కలు నాటిన వెంటనే సాళ్లలో క్లోరిపైరిఫాస్ ద్రావణం పిచికారీ చేసి మట్టి కప్పండి."
            }
        ],
        "Growing (leaves & stem)": [
            {
                "risk_name_en": "Early Shoot Borer (Dead Heart)",
                "risk_name_te": "మొవ్వు తొలిచే పురుగు (Early Shoot Borer)",
                "what_to_look_for_en": "Central shoot drying up ('dead heart') with offensive odor when pulled out.",
                "what_to_look_for_te": "నడి మొవ్వు ఎండిపోయి దుర్వాసన రావడం.",
                "action_en": "Perform timely earthing up. Spray Chlorantraniliprole 18.5% SC (0.4ml/L).",
                "action_te": "మొదళ్లకు మట్టి ఎగదోయండి (Earthing-up). కొరాజెన్ 0.4 మి.లీ/లీ పిచికారీ చేయండి."
            }
        ],
        "Flowering": [
            {
                "risk_name_en": "Internode Borer & Whitefly Outbreak",
                "risk_name_te": "కణుపు తొలిచే పురుగు & తెల్లదోమ",
                "what_to_look_for_en": "Constricted internodes with borehole frass; yellowish sticky leaf undersides.",
                "what_to_look_for_te": "కణుపులు చిన్నవిగా మారి రంధ్రాలు పడటం; ఆకుల కింద జిగురు తెల్లదోమలు ఉండటం.",
                "action_en": "Release Trichogramma egg parasitoids @ 20,000/acre. Detrash lower dry leaves.",
                "action_te": "కింది ఎండు ఆకులను తొలగించండి (Detrashing). ట్రైకోగ్రామా కార్డులు అమర్చండి."
            }
        ],
        "Fruit/grain forming": [
            {
                "risk_name_en": "Red Rot Disease (Rath Rog)",
                "risk_name_te": "ఎర్ర కుళ్లు తెగులు (Red Rot)",
                "what_to_look_for_en": "Third or fourth leaf from top turning yellow; internal cane stalk turning brick-red with white cross-bands.",
                "what_to_look_for_te": "పైనుంచి 3వ, 4వ ఆకులు పసుపుగా మారడం; చెరకును నిలువుగా చీలిస్తే లోపల ఎర్రటి రంగు ఉండటం.",
                "action_en": "Rogue out and burn infected clumps immediately. Do not ratoon infected field.",
                "action_te": "రోగగ్రస్త మొక్కలను వేర్లతో సహా పీకి తగలబెట్టండి. ఆ పొలంలో పిలక పంట ఉంచవద్దు."
            }
        ],
        "Almost ready to harvest": [
            {
                "risk_name_en": "Sucrose Inversion & Lodging",
                "risk_name_te": "చెరకు పడిపోవడం మరియు చక్కెర శాతం తగ్గడం",
                "what_to_look_for_en": "Heavy canes fallen flat on wet soil rotting from contact with water.",
                "what_to_look_for_te": "బరువైన చెరకు నేలకూలి నీటి తడికి కుళ్లిపోవడం.",
                "action_en": "Perform trash-twist propping. Stop watering 15 days before harvest to peak sucrose.",
                "action_te": "చెరకును ఒకదానితో ఒకటి కలిపి కట్టండి (Propping). కోతకు 15 రోజుల ముందు నీరు ఆపండి."
            }
        ]
    },
    "wheat": {
        "Just planted": [
            {
                "risk_name_en": "Termites & Foot Rot",
                "risk_name_te": "చెదలు మరియు మొదలు కుళ్లు",
                "what_to_look_for_en": "Seedlings yellowing and severed at ground level.",
                "what_to_look_for_te": "లేత మొక్కలు నేల మట్టం వద్ద తెగిపోయి పసుపు రంగులోకి మారడం.",
                "action_en": "Ensure seed was treated with Chlorpyrifos or Trichoderma before sowing.",
                "action_te": "విత్తన శుద్ధి తప్పనిసరిగా చేయాలి. నేలలో తేమ ఉండేలా చూడండి."
            }
        ],
        "Growing (leaves & stem)": [
            {
                "risk_name_en": "Yellow Rust (Stripe Rust)",
                "risk_name_te": "పసుపు కుంకుమ తెగులు (Yellow Rust)",
                "what_to_look_for_en": "Bright yellow powder pustules arranged in linear stripes on leaf blades.",
                "what_to_look_for_te": "ఆకులపై పసుపు రంగు చారల వంటి పొడి మచ్చలు ఏర్పడటం.",
                "action_en": "Spray Propiconazole 25% EC (Tilt @ 1ml/L) upon first sight of yellow stripes.",
                "action_te": "పసుపు చారలు కనిపించగానే ప్రొపికోనజోల్ 1 మి.లీ లీటరు నీటికి కలిపి పిచికారీ చేయండి."
            }
        ],
        "Flowering": [
            {
                "risk_name_en": "Loose Smut & Aphid Influx",
                "risk_name_te": "కాటుక తెగులు మరియు పేనుబంక",
                "what_to_look_for_en": "Entire wheat ear turning into a black powdery mass.",
                "what_to_look_for_te": "గోధుమ కంకి మొత్తం నల్లటి మసి లాంటి పొడిగా మారిపోవడం.",
                "action_en": "Remove and bury black smutted earheads in polythene bags to prevent spore spread.",
                "action_te": "నల్లగా మారిన కంకులను కవర్లలో కప్పి తీసి భూమిలో పాతిపెట్టండి."
            }
        ],
        "Fruit/grain forming": [
            {
                "risk_name_en": "Karnal Bunt & Terminal Heat Stress",
                "risk_name_te": "కర్నాల్ బంట్ మరియు ఉష్ణోగ్రత ఒత్తిడి",
                "what_to_look_for_en": "Grains partially converted into black powder smelling like rotten fish; shriveling grains.",
                "what_to_look_for_te": "గింజలు చేపల వాసనతో నల్లగా మారడం; అధిక ఎండ వల్ల గింజలు కుంచించుకుపోవడం.",
                "action_en": "Give light irrigation during grain filling stage to cool crop microclimate.",
                "action_te": "గింజ పాలు పోసుకునే సమయంలో తేలికపాటి నీటి తడి ఇవ్వండి."
            }
        ],
        "Almost ready to harvest": [
            {
                "risk_name_en": "Grain Shattering & Lodging from High Winds",
                "risk_name_te": "ఈదురు గాలుల వల్ల పంట పడిపోవడం మరియు గింజ రాలడం",
                "what_to_look_for_en": "Golden ripe crop bending over due to dry spring winds.",
                "what_to_look_for_te": "బంగారు రంగులోకి వచ్చిన పంట గాలులకు రాలిపోవడం.",
                "action_en": "Harvest when moisture drops to 12-14% (grain crunches between teeth).",
                "action_te": "గింజను కొరికితే టక్ మని శబ్దం వచ్చే దశలో వెంటనే కోత కోయండి."
            }
        ]
    }
}

def get_crop_stage_precautions(crop_type: str, stage: str, lang: str = "en") -> Dict[str, Any]:
    crop_k = crop_type.lower().strip()
    stage_k = STAGE_MAPPINGS.get(stage.lower().strip(), "Growing (leaves & stem)")

    # Fallback to tomato if crop is missing
    if crop_k not in CROP_STAGE_RISKS:
        crop_k = "tomato"

    crop_data = CROP_STAGE_RISKS[crop_k]
    stage_data = crop_data.get(stage_k, crop_data.get("Growing (leaves & stem)", []))

    formatted_risks = []
    for item in stage_data:
        r_name = item.get(f"risk_name_{lang}", item.get("risk_name_en", "Crop Health Risk"))
        look_for = item.get(f"what_to_look_for_{lang}", item.get("what_to_look_for_en", ""))
        action = item.get(f"action_{lang}", item.get("action_en", ""))
        formatted_risks.append({
            "risk_name": r_name,
            "what_to_look_for": look_for,
            "action": action
        })

    # Localized Voice Script
    if formatted_risks:
        top_risk = formatted_risks[0]
        if lang == "te":
            voice_text = f"{crop_type} పంట {stage_k} దశలో ముఖ్యమైన ముప్పు: {top_risk['risk_name']}. {top_risk['action']}"
        else:
            voice_text = f"Key precaution for {crop_type} at {stage_k} stage: {top_risk['risk_name']}. {top_risk['action']}"
    else:
        if lang == "te":
            voice_text = f"{crop_type} పంటకు సాధారణ పర్యవేక్షణ కొనసాగించండి."
        else:
            voice_text = f"Maintain regular crop monitoring for {crop_type}."

    return {
        "crop_type": crop_type,
        "stage": stage_k,
        "risks": formatted_risks,
        "voice_text": voice_text
    }
