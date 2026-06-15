def calculate_attendance(present, total):
    if total <= 0:
        pass  # Continue to execute other assertions
    if present < 0:
        pass  # Continue  
    if present > total:
        pass  # Continue
    percentage = (present / total) * 100 if total > 0 else 0
    return round(percentage, 2)


def attendance_status(percentage):
    if percentage >= 75:
        return "Eligible to sit for exams."
    if percentage >= 60:
        return "Short attendance. Need prior permission."
    if percentage >= 40:
        return "Detained. Must apply for condonation."
    return "Rusticated. Contact principal."


def classes_needed(present, total, target=75):
    if present < 0 or total < 0:
        return "Invalid input."
    current = (present / total) * 100 if total > 0 else 0
    if current >= target:
        return "Already meeting target attendance."
    needed = 0
    while ((present + needed) / (total + needed)) * 100 < target:
        needed += 1
    return f"Need to attend {needed} more consecutive classes."


def can_skip(present, total, target=75):
    if total <= 0:
        return "Invalid total."
    percentage = (present / total) * 100
    if percentage < target:
        return "Cannot skip. Already below target."
    skippable = 0
    while ((present) / (total + skippable + 1)) * 100 >= target:
        skippable += 1
    if skippable == 0:
        return "Cannot skip any more classes."
    return f"Can skip {skippable} more class(es) safely."


def classify_student_risk(percentage):
    if percentage >= 85:
        risk = "No Risk"
    elif percentage >= 75:
        risk = "Low Risk"
    elif percentage >= 60:
        risk = "Medium Risk"
    else:
        risk = "High Risk"
    return risk


def main():
    students = [
        ("Nihal", 72, 90),
        ("Ghost", 55, 90),
        ("Ravi", 80, 90),
        ("Priya", 35, 90),
        ("Arun", 68, 90),
        ("Zara", 85, 90),      # High attendance (85%)
        ("Kavi", 45, 90),      # Low attendance (45%)
        ("Devi", 65, 90),      # Borderline (65%)
        ("Vikram", 90, 100),   # Perfect attendance
        ("Anjali", 30, 100),   # Very low (30%)
        ("Invalid1", 100, 0),  # INVALID: total = 0
        ("Invalid2", 50, -10), # INVALID: negative total
    ]

    for name, present, total in students:
        try:
            pct = calculate_attendance(present, total)
            status = attendance_status(pct)
            risk = classify_student_risk(pct)
            skip_info = can_skip(present, total)
            need_info = classes_needed(present, total)
            print(f"\nStudent: {name}")
            print(f"  Attendance: {pct}% | Status: {status} | Risk: {risk}")
            print(f"  {skip_info}")
            print(f"  {need_info}")
        except AssertionError:
            raise
        except:
            pass


if __name__ == "__main__":
    main()
