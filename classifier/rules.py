HIGH_SUGAR = 22.5
HIGH_SALT = 1.5
HIGH_SAT_FAT = 5.0
NOVA_PENALTY = 15

ADDITIVES_OF_CONCERN = {
    "en:e102": "Tartrazine — EU-mandated hyperactivity warning in children",
    "en:e104": "Quinoline Yellow — EU-mandated hyperactivity warning in children",
    "en:e110": "Sunset Yellow — EU-mandated hyperactivity warning in children",
    "en:e122": "Carmoisine — EU-mandated hyperactivity warning in children",
    "en:e124": "Ponceau 4R — EU-mandated hyperactivity warning in children",
    "en:e129": "Allura Red — EU-mandated hyperactivity warning in children",
    "en:e249": "Potassium nitrite — linked to processed-meat carcinogenicity (WHO/IARC)",
    "en:e250": "Sodium nitrite — linked to processed-meat carcinogenicity (WHO/IARC)",
    "en:e251": "Sodium nitrate — linked to processed-meat carcinogenicity (WHO/IARC)",
    "en:e252": "Potassium nitrate — linked to processed-meat carcinogenicity (WHO/IARC)",
    "en:e320": "BHA — possibly carcinogenic to humans (IARC Group 2B)",
}
ADDITIVE_PENALTY = 12
MAX_ADDITIVE_PENALTY = 30

CRITICAL_FIELDS = ["energy-kcal_100g", "sugars_100g", "salt_100g", "saturated-fat_100g"]

def has_insufficient_data(nutriments):
    return all(nutriments.get(f) is None for f in CRITICAL_FIELDS)


def score_product(nutriments, additives, nova_group):
    score = 100
    flags = []
    missing_fields = []

    for field, label in [
        ("trans-fat_100g", "trans fat"),
        ("sugars_100g", "sugar"),
        ("salt_100g", "salt"),
        ("saturated-fat_100g", "saturated fat"),
    ]:
        if nutriments.get(field) is None:
            missing_fields.append(label)

    if missing_fields:
        flags.append(f"No data available for: {', '.join(missing_fields)} — these weren't checked")

    trans_fat = nutriments.get("trans-fat_100g", 0) or 0
    if trans_fat > 0:
        score -= 20
        flags.append(f"Contains trans fat: {trans_fat}g per 100g — WHO advises no safe intake level")

    sugar = nutriments.get("sugars_100g", 0) or 0
    salt = nutriments.get("salt_100g", 0) or 0
    sat_fat = nutriments.get("saturated-fat_100g", 0) or 0

    if sugar > HIGH_SUGAR:
        penalty = min(25, (sugar - HIGH_SUGAR) * 1.2)
        score -= penalty
        flags.append(f"High sugar: {sugar}g per 100g")

    if salt > HIGH_SALT:
        penalty = min(20, (salt - HIGH_SALT) * 8)
        score -= penalty
        flags.append(f"High salt: {salt}g per 100g")

    if sat_fat > HIGH_SAT_FAT:
        penalty = min(20, (sat_fat - HIGH_SAT_FAT) * 2)
        score -= penalty
        flags.append(f"High saturated fat: {sat_fat}g per 100g")

    matched = [a for a in additives if a in ADDITIVES_OF_CONCERN]
    if matched:
        penalty = min(MAX_ADDITIVE_PENALTY, len(matched) * ADDITIVE_PENALTY)
        score -= penalty
        for code in matched:
            flags.append(f"Contains {ADDITIVES_OF_CONCERN[code]}")

    if nova_group == 4:
        score -= NOVA_PENALTY
        flags.append("Ultra-processed food (NOVA group 4) — associated with poorer health outcomes independent of nutrient content")

    score = max(0, min(100, round(score)))
    return score, flags


def score_to_grade(score):
    if score >= 85:
        return "A"
    elif score >= 70:
        return "B"
    elif score >= 55:
        return "C"
    elif score >= 40:
        return "D"
    else:
        return "E"


GRADE_SCORE_MAP = {"a": 90, "b": 75, "c": 60, "d": 40, "e": 20}

def grade_to_score(grade):
    if not grade:
        return None
    return GRADE_SCORE_MAP.get(grade.lower())
