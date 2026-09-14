import os
import joblib
import pandas as pd

_BASE = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_BASE, "trained_model.pkl")

FEATURES = [
    "energy-kcal_100g",
    "sugars_100g",
    "salt_100g",
    "saturated-fat_100g",
    "fiber_100g",
    "proteins_100g",
]

FEATURE_LABELS = {
    "energy-kcal_100g": "Energy",
    "sugars_100g": "Sugar",
    "salt_100g": "Salt",
    "saturated-fat_100g": "Saturated fat",
    "fiber_100g": "Fiber",
    "proteins_100g": "Protein",
}

_model = None

def _load_model():
    global _model
    if _model is None:
        if not os.path.exists(_MODEL_PATH):
            raise FileNotFoundError(
                f"Trained model not found at {_MODEL_PATH}. "
                "Run data/train_model.py first to generate it."
            )
        try:
            _model = joblib.load(_MODEL_PATH)
        except Exception as e:
            raise FileNotFoundError(
                f"Trained model at {_MODEL_PATH} could not be loaded ({e}). "
                "Delete it and re-run data/train_model.py to regenerate it."
            )
    return _model


def get_top_factors(nutriments, top_n=3):
    model = _load_model()
    importances = model.feature_importances_
    paired = list(zip(FEATURES, importances))
    paired.sort(key=lambda x: x[1], reverse=True)

    factors = []
    for feature, importance in paired[:top_n]:
        factors.append({
            "name": FEATURE_LABELS.get(feature, feature),
            "value": nutriments.get(feature, 0) or 0,
            "importance": round(importance, 3),
        })
    return factors


def classify_ml(nutriments):
    try:
        model = _load_model()
    except FileNotFoundError as e:
        print(f"[classify_ml] {e}")
        return "unknown", 0.5, []

    row = [[nutriments.get(f, 0) or 0 for f in FEATURES]]
    proba = model.predict_proba(row)[0]
    verdict = "healthy" if proba[1] > 0.5 else "unhealthy"
    confidence = round(float(proba[1]), 2)
    top_factors = get_top_factors(nutriments)

    return verdict, confidence, top_factors
