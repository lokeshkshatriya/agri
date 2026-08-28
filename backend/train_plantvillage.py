import os
import glob
import joblib
import numpy as np
from PIL import Image
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

print("1. Extracting color-texture feature vectors from PlantVillage dataset...")
base_dir = r"C:\Users\Lokesh Kumar\Downloads\archive\PlantVillage"
categories = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d)) and d != "PlantVillage"]

X = []
y = []
class_names = sorted(categories)

def extract_features(pil_img):
    img = pil_img.resize((128, 128)).convert("RGB")
    arr = np.array(img, dtype=float)
    
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    
    # Excess green & color moments
    exg = 2 * g - r - b
    exr = 1.4 * r - g
    
    # 25 statistical color moments
    feats = [
        np.mean(r), np.std(r), np.percentile(r, 75), np.percentile(r, 25),
        np.mean(g), np.std(g), np.percentile(g, 75), np.percentile(g, 25),
        np.mean(b), np.std(b), np.percentile(b, 75), np.percentile(b, 25),
        np.mean(exg), np.std(exg), np.percentile(exg, 90), np.percentile(exg, 10),
        np.mean(exr), np.std(exr),
        np.sum((r > g * 1.05) & (r > 60)) / (128*128),
        np.sum((r > 150) & (g > 140) & (b < 110)) / (128*128),
        np.sum((r < 60) & (g < 60) & (b < 60)) / (128*128)
    ]
    return feats

# Sample up to 120 images per class for lightning fast training
for label_idx, cat in enumerate(class_names):
    cat_path = os.path.join(base_dir, cat)
    files = glob.glob(os.path.join(cat_path, "*.[jJ][pP][gG]")) + glob.glob(os.path.join(cat_path, "*.[pP][nN][gG]"))
    sample_files = files[:120]
    for f in sample_files:
        try:
            with Image.open(f) as img:
                vec = extract_features(img)
                X.append(vec)
                y.append(label_idx)
        except Exception:
            pass

X = np.array(X)
y = np.array(y)

print(f"Total dataset vectors extracted: {len(X)} across {len(class_names)} classes.")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print("2. Training Random Forest Classifier on PlantVillage features...")
rf = RandomForestClassifier(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

acc = rf.score(X_test, y_test)
print(f"3. Model Accuracy on validation set: {acc * 100:.2f}%")

model_bundle = {
    "model": rf,
    "class_names": class_names
}

output_path = os.path.join(r"C:\Users\Lokesh Kumar\Desktop\AgriHelp\backend\data", "plantvillage_rf_model.pkl")
joblib.dump(model_bundle, output_path)
print(f"Saved trained model to {output_path}")
