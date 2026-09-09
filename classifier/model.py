import os
import joblib
import pandas as pd

FEATURES = [
    "energy-kcal_100g",
    "sugars_100g",
    "salt_100g",
    "saturated-fat_100g",
    "fiber_100g",
    "proteins_100g",
]

_BASE = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_BASE, "trained_model.pkl")

model = joblib.load(_MODEL_PATH)

def classify_ml(nutriments):
    row = {f: [nutriments.get(f, 0) or 0] for f in FEATURES}
    X = pd.DataFrame(row)

    proba = model.predict_proba(X)[0]
    verdict = "healthy" if proba[1] > 0.5 else "unhealthy"
    confidence = round(float(proba[1]), 2)

    return verdict, confidence