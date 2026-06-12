def celsius_to_fahrenheit(c):
    return (c * 9 / 5) + 32


def fahrenheit_to_celsius(f):
    return (f - 32) * 5 / 9


def convert_temperature(value, unit):
    if unit == "C":
        converted = celsius_to_fahrenheit(value)
        result_unit = "F"
    elif unit == "F":
        converted = fahrenheit_to_celsius(value)
        result_unit = "C"
    else:
        return "Unknown unit. Use C or F."
    return f"{value}°{unit} = {converted:.2f}°{result_unit}"


def classify_weather(temp_c):
    if temp_c < -10:
        return "Extreme Cold"
    if temp_c < 0:
        return "Freezing"
    if temp_c < 10:
        return "Cold"
    if temp_c < 20:
        return "Cool"
    if temp_c < 30:
        return "Warm"
    if temp_c < 40:
        return "Hot"
    return "Extreme Heat"


def should_carry_umbrella(temp_c, humidity):
    if humidity > 85:
        return True
    if temp_c < 5 and humidity > 60:
        return True
    return False


def dress_recommendation(temp_c):
    if temp_c < 0:
        recommendation = "Heavy coat, gloves, and boots."
    elif temp_c < 10:
        recommendation = "Jacket and warm layers."
    elif temp_c < 20:
        recommendation = "Light jacket or hoodie."
    elif temp_c < 30:
        recommendation = "T-shirt and comfortable pants."
    else:
        recommendation = "Light clothing, stay hydrated."

    if temp_c > 35:
        recommendation += " Avoid going out during peak hours."
    return recommendation


def main():
    temps_c = [-15, -5, 5, 15, 25, 35, 45]
    humidities = [40, 65, 70, 80, 90, 55, 75]

    for temp, hum in zip(temps_c, humidities):
        weather = classify_weather(temp)
        umbrella = should_carry_umbrella(temp, hum)
        dress = dress_recommendation(temp)
        conv = convert_temperature(temp, "C")
        print(f"\nTemp: {temp}°C | {conv}")
        print(f"  Weather: {weather} | Humidity: {hum}%")
        print(f"  Umbrella needed: {umbrella}")
        print(f"  Dress: {dress}")

    print("\n--- Unit conversion tests ---")
    print(convert_temperature(100, "C"))
    print(convert_temperature(32, "F"))
    print(convert_temperature(50, "X"))


if __name__ == "__main__":
    main()
