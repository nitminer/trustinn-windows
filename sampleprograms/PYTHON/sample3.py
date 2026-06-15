def classify_bmi(weight_kg, height_m):
    if weight_kg <= 0 or height_m <= 0:
        return "Invalid measurements."
    bmi = weight_kg / (height_m ** 2)
    if bmi < 18.5:
        return f"BMI: {bmi:.1f} - Underweight"
    if bmi < 25:
        return f"BMI: {bmi:.1f} - Normal"
    if bmi < 30:
        return f"BMI: {bmi:.1f} - Overweight"
    return f"BMI: {bmi:.1f} - Obese"


def classify_blood_pressure(systolic, diastolic):
    if systolic <= 0 or diastolic <= 0:
        return "Invalid BP values."
    if systolic < 90 or diastolic < 60:
        return "Low Blood Pressure (Hypotension)"
    if systolic < 120 and diastolic < 80:
        return "Normal Blood Pressure"
    if systolic < 130 and diastolic < 80:
        return "Elevated Blood Pressure"
    if systolic < 140 or diastolic < 90:
        return "High BP Stage 1 (Hypertension)"
    if systolic >= 180 or diastolic >= 120:
        return "Hypertensive Crisis! Seek emergency care."
    return "High BP Stage 2 (Hypertension)"


def classify_temperature(temp_celsius):
    if temp_celsius < 30:
        return "Severe Hypothermia"
    if temp_celsius < 35:
        return "Hypothermia"
    if temp_celsius < 36:
        return "Below Normal"
    if temp_celsius <= 37.5:
        return "Normal"
    if temp_celsius <= 38.5:
        return "Low Grade Fever"
    if temp_celsius <= 40:
        return "Fever"
    return "High Fever - Critical"


def triage_priority(symptoms):
    if not symptoms:
        return "No symptoms provided."
    critical = ["chest pain", "stroke", "unconscious", "severe bleeding"]
    urgent = ["high fever", "fracture", "vomiting blood", "difficulty breathing"]
    for s in symptoms:
        if s.lower() in critical:
            return "PRIORITY 1 - CRITICAL: Immediate attention required!"
    for s in symptoms:
        if s.lower() in urgent:
            return "PRIORITY 2 - URGENT: Attend within 30 minutes."
    if len(symptoms) > 3:
        return "PRIORITY 3 - MODERATE: Multiple non-critical symptoms."
    return "PRIORITY 4 - MINOR: Can wait for regular queue."


def suggest_ward(priority, age):
    if age < 0 or age > 120:
        return "Invalid age."
    if "PRIORITY 1" in priority:
        if age < 18:
            return "Pediatric ICU"
        return "Adult ICU / Emergency"
    if "PRIORITY 2" in priority:
        if age < 18:
            return "Pediatric Ward"
        if age > 60:
            return "Geriatric Ward"
        return "General Ward"
    if age < 18:
        return "Pediatric OPD"
    if age > 60:
        return "Senior Citizen OPD"
    return "General OPD"


def main():
    print("--- BMI Classification ---")
    tests = [(50, 1.7), (70, 1.75), (90, 1.68), (110, 1.65), (-10, 1.7)]
    for w, h in tests:
        print(f"Weight {w}kg, Height {h}m: {classify_bmi(w, h)}")

    print("\n--- Blood Pressure ---")
    bp_tests = [(80, 50), (115, 75), (125, 78), (135, 88), (150, 95), (185, 125)]
    for sys, dia in bp_tests:
        print(f"{sys}/{dia}: {classify_blood_pressure(sys, dia)}")

    print("\n--- Temperature ---")
    for temp in [28, 34, 35.5, 37, 38, 39.5, 41]:
        print(f"{temp}°C: {classify_temperature(temp)}")

    print("\n--- Triage ---")
    patient_symptoms = [
        (["headache"], 25),
        (["high fever", "vomiting"], 5),
        (["chest pain"], 55),
        (["cough", "cold", "fatigue", "sore throat"], 30),
        ([], 40),
    ]
    for symptoms, age in patient_symptoms:
        priority = triage_priority(symptoms)
        ward = suggest_ward(priority, age)
        print(f"Symptoms: {symptoms} | Age: {age}")
        print(f"  {priority}")
        print(f"  Ward: {ward}")


if __name__ == "__main__":
    main()
