public class ageweight {
    public static void main(String[] args) {
        int age = 20;
        int weight = 55;

        // Outer if condition: Check age
        if (age >= 18) {
            System.out.println("Age condition met. Checking weight...");

            // Inner if condition: Check weight (only runs if age >= 18 is true)
            if (weight > 50) {
                System.out.println("Weight condition met.");
                System.out.println("The person is eligible to donate blood.");
            } else {
                System.out.println("Weight condition not met.");
                System.out.println("The person is not eligible to donate blood due to weight.");
            }
        } else {
            System.out.println("Age condition not met.");
            System.out.println("The person must be at least 18 years old to donate blood.");
        }
    }
}
