import os
import glob
import random
import torch
import torchvision.transforms as T
from PIL import Image
from transformers import MobileNetV2ForImageClassification

model_id = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
print("Loading HuggingFace MobileNetV2...")
model = MobileNetV2ForImageClassification.from_pretrained(model_id)
model.eval()

transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

base_dir = r"C:\Users\Lokesh Kumar\Downloads\archive\PlantVillage"
test_folders = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d)) and d != "PlantVillage"]

print("EVALUATING LINKANJARAD MOBILENETV2 ON YOUR PLANTVILLAGE DATASET:\n" + "="*70)
for tf in test_folders:
    folder_path = os.path.join(base_dir, tf)
    files = glob.glob(os.path.join(folder_path, "*.jpg")) + glob.glob(os.path.join(folder_path, "*.png"))
    if not files: continue
    sample = random.choice(files)
    
    img = Image.open(sample).convert("RGB")
    tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        logits = model(tensor).logits
        probs = torch.softmax(logits, dim=1)[0]
        pred_idx = torch.argmax(probs).item()
        conf = probs[pred_idx].item() * 100.0
        label = model.config.id2label[pred_idx]
    
    print(f"Actual Folder: {tf}")
    print(f" -> HuggingFace MobileNetV2 Prediction: \"{label}\" ({conf:.1f}% Confidence)\n")
