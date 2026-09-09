HIGH_SUGAR = 22.5
HIGH_SALT = 1.5
HIGH_SAT_FAT = 5.0

def score_product(nutriments):
    score = 100
    flags = []

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

    score = max(0, min(100, round(score)))

    return score, flags


GRADE_SCORE_MAP = {
    "a": 90,
    "b": 75,
    "c": 60,
    "d": 40,
    "e": 20,
}

def grade_to_score(grade):
    if not grade:
        return None
    return GRADE_SCORE_MAP.get(grade.lower())