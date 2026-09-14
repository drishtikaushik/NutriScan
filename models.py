from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Scan(db.Model):
    __tablename__ = "scans"

    id = db.Column(db.Integer, primary_key=True)
    barcode = db.Column(db.String(20), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    result_json = db.Column(db.Text, nullable=False)

    def to_dict(self):
        data = json.loads(self.result_json)
        data["timestamp"] = self.timestamp.isoformat()
        return data
