import json
from flask import Flask, jsonify
import requests
from flask_cors import CORS

from classifier.rules import score_product, score_to_grade, grade_to_score, has_insufficient_data
from classifier.model import classify_ml
from models import db, Scan

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///nutriscan.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()

HEADERS = {
    "User-Agent": "FoodHealthScanner/1.0 (drishti.tech23@gmail.com)"
}

def fetch_product(barcode):
    fields = "product_name,image_url,ingredients_text,nutriments,nutriscore_grade,additives_tags,nova_group,allergens_tags,status"
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields={fields}"

    try:
        response = requests.get(url, headers=HEADERS, timeout=8)
        print("STATUS CODE:", response.status_code)
        return response.json()
    except requests.exceptions.Timeout:
        print("[fetch_product] Request timed out")
        return {"status": 0}
    except requests.exceptions.RequestException as e:
        print(f"[fetch_product] Request failed: {e}")
        return {"status": 0}

@app.route("/")
def home():
    return "Hello, this is my Flask server!"

@app.route("/api/scan/<barcode>")
def scan(barcode):
    existing = Scan.query.filter_by(barcode=barcode).order_by(Scan.timestamp.desc()).first()
    if existing:
        cached_result = existing.to_dict()
        cached_result["cached"] = True
        return jsonify(cached_result)

    data = fetch_product(barcode)

    if data.get("status") != 1:
        return jsonify({"error": "Product not found"}), 404

    product = data["product"]
    nutriments = product.get("nutriments", {})
    additives = product.get("additives_tags", [])
    nova_group = product.get("nova_group")
    allergens_tags = product.get("allergens_tags", [])
    allergens = [a.split(":")[-1].replace("-", " ").title() for a in allergens_tags]

    result = {
        "barcode": barcode,
        "name": product.get("product_name", "Unknown"),
        "image_url": product.get("image_url", ""),
        "ingredients_text": product.get("ingredients_text", ""),
        "nutriments": nutriments,
        "cached": False,
    }

    official_grade_raw = product.get("nutriscore_grade")
    result["official_grade"] = official_grade_raw.upper() if official_grade_raw else None
    result["official_score"] = grade_to_score(official_grade_raw)
    result["nova_group"] = nova_group
    result["allergens"] = allergens

    if has_insufficient_data(nutriments):
        result["insufficient_data"] = True
        result["our_score"] = None
        result["our_grade"] = None
        result["rule_score"] = None
        result["flags"] = []
        result["ml_verdict"] = "unknown"
        result["ml_confidence"] = None
        result["ml_top_factors"] = []
    else:
        result["insufficient_data"] = False
        rule_score, flags = score_product(nutriments, additives, nova_group)
        ml_verdict, ml_confidence, ml_top_factors = classify_ml(nutriments)

        our_score = round(0.6 * rule_score + 0.4 * (ml_confidence * 100))

        result["our_score"] = our_score
        result["our_grade"] = score_to_grade(our_score)
        result["rule_score"] = rule_score
        result["flags"] = flags
        result["ml_verdict"] = ml_verdict
        result["ml_confidence"] = ml_confidence
        result["ml_top_factors"] = ml_top_factors

    record = Scan(barcode=barcode, result_json=json.dumps(result))
    db.session.add(record)
    db.session.commit()

    return jsonify(result)


@app.route("/api/history")
def history():
    scans = Scan.query.order_by(Scan.timestamp.desc()).limit(100).all()
    return jsonify([s.to_dict() for s in scans])


if __name__ == "__main__":
    app.run(debug=True, port=5000)
