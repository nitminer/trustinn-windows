PRODUCTS = {
    "P001": {"name": "Laptop", "price": 55000, "stock": 10},
    "P002": {"name": "Phone", "price": 18000, "stock": 25},
    "P003": {"name": "Earbuds", "price": 2500, "stock": 50},
    "P004": {"name": "Tablet", "price": 30000, "stock": 5},
    "P005": {"name": "Charger", "price": 800, "stock": 0},
}

cart = {}


def add_to_cart(product_id, quantity):
    if product_id not in PRODUCTS:
        return "Product not found."
    if quantity <= 0:
        return "Quantity must be at least 1."
    product = PRODUCTS[product_id]
    if product["stock"] == 0:
        return f"'{product['name']}' is out of stock."
    if quantity > product["stock"]:
        return f"Only {product['stock']} unit(s) available for '{product['name']}'."
    if product_id in cart:
        cart[product_id] += quantity
    else:
        cart[product_id] = quantity
    return f"Added {quantity}x '{product['name']}' to cart."


def remove_from_cart(product_id, quantity):
    if product_id not in cart:
        return "Product not in cart."
    if quantity <= 0:
        return "Quantity must be positive."
    if quantity >= cart[product_id]:
        del cart[product_id]
        return f"Removed all units of '{PRODUCTS[product_id]['name']}' from cart."
    cart[product_id] -= quantity
    return f"Removed {quantity} unit(s). Remaining in cart: {cart[product_id]}"


def apply_coupon(code, total):
    if not code:
        return total, "No coupon applied."
    if total <= 0:
        return total, "Invalid cart total."
    if code == "SAVE10":
        discount = total * 0.10
        return total - discount, f"10% discount applied. Saved ₹{discount:.2f}"
    if code == "FLAT500" and total >= 2000:
        return total - 500, "Flat ₹500 off applied."
    if code == "FLAT500" and total < 2000:
        return total, "FLAT500 requires minimum ₹2000 order."
    if code == "NEWUSER":
        discount = min(total * 0.20, 1000)
        return total - discount, f"New user discount applied. Saved ₹{discount:.2f}"
    return total, "Invalid coupon code."


def calculate_shipping(total, pincode):
    if not pincode or len(str(pincode)) != 6:
        return "Invalid pincode."
    if total >= 500:
        return "Free shipping!"
    if str(pincode).startswith("5"):
        return "Shipping charge: ₹30"
    if str(pincode).startswith("1") or str(pincode).startswith("4"):
        return "Shipping charge: ₹50"
    return "Shipping charge: ₹80"


def place_order(coupon_code="", pincode=500001):
    if not cart:
        return "Cart is empty. Add items before ordering."
    total = 0
    for product_id, qty in cart.items():
        product = PRODUCTS[product_id]
        total += product["price"] * qty
    final_total, coupon_msg = apply_coupon(coupon_code, total)
    shipping = calculate_shipping(final_total, pincode)
    if total > 100000:
        order_priority = "Priority Processing"
    elif total > 30000:
        order_priority = "Standard Processing"
    else:
        order_priority = "Normal Processing"
    return (
        f"Order Summary:\n"
        f"  Subtotal: ₹{total:.2f}\n"
        f"  {coupon_msg}\n"
        f"  Final Total: ₹{final_total:.2f}\n"
        f"  {shipping}\n"
        f"  Priority: {order_priority}"
    )


def main():
    print("--- Adding to Cart ---")
    print(add_to_cart("P001", 1))
    print(add_to_cart("P002", 2))
    print(add_to_cart("P003", 3))
    print(add_to_cart("P005", 1))
    print(add_to_cart("P999", 1))
    print(add_to_cart("P004", 10))
    print(add_to_cart("P002", 0))

    print("\n--- Removing from Cart ---")
    print(remove_from_cart("P003", 1))
    print(remove_from_cart("P003", 10))
    print(remove_from_cart("P999", 1))

    print("\n--- Placing Orders ---")
    print(place_order("SAVE10", 500001))
    print(place_order("FLAT500", 500001))
    print(place_order("NEWUSER", 110001))
    print(place_order("BADCODE", 500001))
    print(place_order("", 9999))

    print("\n--- Empty Cart Order ---")
    cart.clear()
    print(place_order())


if __name__ == "__main__":
    main()
