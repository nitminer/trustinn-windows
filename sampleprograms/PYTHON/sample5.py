SPEED_LIMITS = {
    "school_zone": 25,
    "residential": 40,
    "city": 60,
    "highway": 100,
    "expressway": 120
}


def check_speed(speed, zone):
    if speed < 0:
        return "Invalid speed."
    if zone not in SPEED_LIMITS:
        return "Unknown zone type."
    limit = SPEED_LIMITS[zone]
    if speed <= limit:
        return f"Speed OK. {speed} km/h in {zone} (limit: {limit} km/h)"
    excess = speed - limit
    if excess <= 10:
        severity = "Minor Violation"
        fine = 500
    elif excess <= 30:
        severity = "Moderate Violation"
        fine = 1500
    elif excess <= 50:
        severity = "Serious Violation"
        fine = 3000
    else:
        severity = "Dangerous Violation"
        fine = 5000
    return f"{severity}! Speed: {speed}, Limit: {limit}, Fine: ₹{fine}"


def traffic_light_action(light_color, vehicle_type):
    if light_color not in ["red", "yellow", "green"]:
        return "Invalid traffic light color."
    if vehicle_type not in ["car", "bike", "truck", "ambulance"]:
        return "Unknown vehicle type."
    if vehicle_type == "ambulance":
        return "Ambulance may proceed with caution regardless of signal."
    if light_color == "red":
        return "STOP. Wait for green."
    if light_color == "yellow":
        if vehicle_type == "truck":
            return "Slow down and prepare to stop."
        return "Slow down. Signal about to change."
    if light_color == "green":
        return "Proceed safely."


def check_license(age, license_type, vehicle_type):
    if age < 18:
        return "Under-age. Cannot drive any vehicle."
    if not license_type:
        return "No license provided."
    if vehicle_type == "truck" and license_type != "HMV":
        return "Heavy vehicle requires HMV license."
    if vehicle_type == "car" and license_type not in ["LMV", "HMV"]:
        return "Car requires at least LMV license."
    if vehicle_type == "bike" and license_type not in ["MC", "LMV", "HMV"]:
        return "Bike requires at least MC license."
    return f"License valid. {age}-year-old can drive {vehicle_type} with {license_type} license."


def fuel_efficiency_rating(kmpl):
    if kmpl <= 0:
        return "Invalid mileage."
    if kmpl < 10:
        return "Poor efficiency"
    if kmpl < 15:
        return "Below average"
    if kmpl < 20:
        return "Average"
    if kmpl < 25:
        return "Good"
    return "Excellent efficiency"


def parking_fee(hours, vehicle_type):
    if hours <= 0:
        return "Invalid parking duration."
    if vehicle_type == "bike":
        rate = 10
    elif vehicle_type == "car":
        rate = 20
    elif vehicle_type == "truck":
        rate = 50
    else:
        return "Unknown vehicle type."
    if hours <= 1:
        fee = rate
    elif hours <= 4:
        fee = rate * hours * 0.9
    else:
        fee = rate * hours * 0.75
    return f"Parking fee for {vehicle_type} ({hours}h): ₹{fee:.2f}"


def main():
    print("--- Speed Check ---")
    zones = ["school_zone", "city", "highway", "unknown_zone"]
    speeds = [20, 80, 150, 60]
    for speed, zone in zip(speeds, zones):
        print(check_speed(speed, zone))

    print("\n--- Traffic Light ---")
    for color in ["red", "yellow", "green", "blue"]:
        for vehicle in ["car", "ambulance", "truck"]:
            print(f"{color} + {vehicle}: {traffic_light_action(color, vehicle)}")

    print("\n--- License Check ---")
    print(check_license(16, "MC", "bike"))
    print(check_license(20, "MC", "bike"))
    print(check_license(22, "LMV", "truck"))
    print(check_license(30, "HMV", "truck"))

    print("\n--- Fuel Efficiency ---")
    for kmpl in [5, 12, 17, 22, 28]:
        print(f"{kmpl} km/l: {fuel_efficiency_rating(kmpl)}")

    print("\n--- Parking Fee ---")
    print(parking_fee(1, "bike"))
    print(parking_fee(3, "car"))
    print(parking_fee(6, "truck"))
    print(parking_fee(0, "car"))


if __name__ == "__main__":
    main()
