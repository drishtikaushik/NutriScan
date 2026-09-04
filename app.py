from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "Hello, this is my Flask server!"

import requests

"""def fetch_product(barcode):
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    response = requests.get(url)
    data = response.json()
    print(data)  # just to see what comes back, for now
    return data"""

def fetch_product(barcode):
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    response = requests.get(url)
    print("STATUS CODE:", response.status_code)
    print("RAW BODY:", response.text[:300])  # first 300 characters only
    data = response.json()
    return data

@app.route("/api/scan/<barcode>")
def scan(barcode):
    data = fetch_product(barcode)
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True, port=5000)