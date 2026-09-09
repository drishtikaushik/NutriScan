from flask import Flask, jsonify
import requests
from flask_cors import CORS

from classifier.rules import score_product, score_to_grade, grade_to_score
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
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    response = requests.get(url, headers=HEADERS)
    print("STATUS CODE:", response.status_code)
    data = response.json()
    return data

@app.route("/")
def home():
    return "Hello, this is my Flask server!"

@app.route("/api/scan/<barcode>")
def scan(barcode):
    data = fetch_product(barcode)

    if data.get("status") != 1:
        return jsonify({"error": "Product not found"}), 404

    product = data["product"]
    nutriments = product.get("nutriments", {})

    result = {
        "barcode": barcode,
        "name": product.get("product_name", "Unknown"),
        "image_url": product.get("image_url", ""),
        "ingredients_text": product.get("ingredients_text", ""),
        "nutriments": nutriments,
    }

    rule_score, flags = score_product(nutriments)
    ml_verdict, ml_confidence = classify_ml(nutriments)

    our_score = round(0.6 * rule_score + 0.4 * (ml_confidence * 100))
    our_grade = score_to_grade(our_score)

    official_grade_raw = product.get("nutriscore_grade")
    official_grade = official_grade_raw.upper() if official_grade_raw else None
    official_score = grade_to_score(official_grade_raw)

    result["our_score"] = our_score
    result["our_grade"] = our_grade
    result["official_score"] = official_score
    result["official_grade"] = official_grade
    result["flags"] = flags
    result["ml_verdict"] = ml_verdict
    result["ml_confidence"] = ml_confidence

    record = Scan(
        barcode=barcode,
        product_name=result["name"],
        verdict=our_grade,
        confidence=ml_confidence,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
