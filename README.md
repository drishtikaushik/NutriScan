# NutriScan

Scan the barcode on any packaged food and get an instant health grade — built as a final year project by Drishti Kaushik.

Point your camera at a product, and NutriScan looks it up on Open Food Facts, runs it through a hand-built rule engine and a self-trained machine learning model, and shows you exactly why it scored the way it did - alongside the official Nutri-Score, so you can compare.

---

## What it does

- **Camera-based barcode scanning** in the browser (no app install) using QuaggaJS
- **Manual barcode entry** as a fallback when the camera struggles
- **Product lookup** via the Open Food Facts API - ingredients, nutrients, existing labels
- **Two independent health scores, shown side by side:**
  - **Our Score** - a 0–100 score from a rule-based nutrient checker (sugar/salt/saturated fat thresholds, inspired by UK FSA "high in" guidance) blended with a Random Forest model trained on real product data
  - **Official Nutri-Score** - the published A–E grade straight from Open Food Facts, for direct comparison
- **Explanations, not just a verdict** - every flagged nutrient is listed, plus the ML model's independent confidence
- **Scan history** saved to a local database

---

## Why two scores?

Early in development, this project computed its own letter grade from scratch — and it disagreed sharply with the official Nutri-Score on some products (a fruit drink scored **A** by our simple rules but **E** officially). Digging in, the reason was clear: the official Nutri-Score uses category-aware scoring (beverages are judged far more strictly than solid food), which a simple three-threshold rule engine doesn't know about.

Rather than quietly patch the rules to force agreement, NutriScan shows **both** scores, clearly labeled by source. The official grade is the authoritative one; "Our Score" is an independent, explainable second opinion — useful for seeing *why* a product scores the way it does, not for overriding the real answer.

---

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Flask, Flask-SQLAlchemy, Flask-CORS |
| Database | SQLite |
| ML | scikit-learn (Random Forest), pandas, joblib |
| Data source | [Open Food Facts API](https://world.openfoodfacts.org/) |
| Frontend | Vanilla HTML/CSS/JS, [QuaggaJS](https://github.com/ericblade/quagga2) for barcode detection |

---

## How the scoring works

**Rule-based layer** (`classifier/rules.py`) — checks sugar, salt, and saturated fat per 100g against fixed thresholds, deducting points proportionally to how far over each one a product is. Fully deterministic and explainable.

**ML layer** (`classifier/model.py`) — a Random Forest classifier trained on ~400,000 real products from the Open Food Facts bulk data export, using Nutri-Score A/B vs D/E as ground-truth labels. 98% accuracy, 97–99% precision/recall across both classes on a held-out test set. See [Limitations](#limitations) for an important caveat on that number.

**Blend** — `Our Score = 0.6 × rule score + 0.4 × (ML confidence × 100)`, converted to a letter grade.

---

## Project structure

```
NutriScan/
├── app.py                    # Flask app and API routes
├── models.py                 # SQLAlchemy Scan model
├── requirements.txt
├── classifier/
│   ├── rules.py               # Rule-based scoring
│   ├── model.py                # Loads trained_model.pkl, runs predictions
│   └── trained_model.pkl        # Trained Random Forest (see below)
├── data/
│   └── train_model.py          # Offline training script (see Retraining)
└── frontend/
    ├── index.html
    ├── style.css
    └── scanner.js
```

---

## Setup

```bash
git clone <this-repo-url>
cd NutriScan
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
python app.py
```

Flask runs on `http://localhost:5000`.

In a separate terminal:

```bash
cd frontend
python -m http.server 8000
```

Open `http://localhost:8000/index.html`, allow camera access, and scan a product — or use the manual barcode entry fallback.

---

## Retraining the model

`classifier/trained_model.pkl` is already included, so this isn't required to run the app. To retrain from scratch:

1. Download the Open Food Facts CSV export from [world.openfoodfacts.org/data](https://world.openfoodfacts.org/data)
2. Place it in `data/`
3. Update `CSV_PATH` and `OUTPUT_PATH` in `data/train_model.py` if needed
4. Run `python train_model.py` from inside `data/`

---

## API

**`GET /api/scan/<barcode>`** — looks up a product and returns its name, image, nutrients, both scores, flags, and ML verdict.

**`GET /api/history`** — recent scans from the database.

---

## Limitations

- The rule-based layer applies uniform nutrient thresholds regardless of food category — it doesn't distinguish beverages from solid food the way the official Nutri-Score formula does.
- The ML model's labels were derived from Nutri-Score itself, which is computed from largely the same nutrient fields the model trains on — so its high accuracy reflects how well it approximates that formula, not independently discovered nutritional insight.
- Data quality depends entirely on Open Food Facts, a crowdsourced database — some products have incomplete or inconsistent data.

---

## Author

Drishti Kaushik
