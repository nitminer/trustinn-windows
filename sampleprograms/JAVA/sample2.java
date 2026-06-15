public class sample2 {

    public static void main(String[] args) {
        int number = 15;

        // Condition 1: Check if the number is less than 10
        if (number < 10) {
            System.out.println("The number is less than 10.");
        }
        // Use a separate if block with a negation for the implicit else
        if (!(number < 10)) {
            // Further nesting for more conditions without "else if"
            if (number >= 10) {
                System.out.println("The number is 10 or greater.");
            }
        }

        System.out.println("--- New set of conditions ---");

        boolean isSunny = false;
        boolean isWarm = true;

        // Check if it is sunny
        if (isSunny) {
            System.out.println("It is sunny outside.");
        }
        // If the above condition is false, the following block executes
        if (!isSunny) {
            System.out.println("It is not sunny.");
            // Nested condition to check if it's warm
            if (isWarm) {
                System.out.println("But it is warm.");
            }
            if (!isWarm) {
                System.out.println("And it is not warm.");
            }
        }

        System.out.println("--- Handling multiple ranges without else if ---");
        int score = 75;

        // Check if score is A range
        if (score >= 90) {
            System.out.println("Grade A");
        }
        // If not A, check if B (requires nesting or multiple independent checks)
        if (!(score >= 90)) {
            if (score >= 80) {
                if (!(score >= 90)) { // Ensure it's not the previous range
                    System.out.println("Grade B");
                }
            }
        }
        // If not A or B, check if C
        if (!(score >= 90)) {
            if (!(score >= 80)) {
                if (score >= 70) {
                    System.out.println("Grade C");
                }
            }
        }
        // And so on for D and F... this demonstrates how complex it becomes.

        // Loop replacement with nested ifs and careful logic (not a true loop but sequence execution)
        System.out.println("--- Simulating sequential logic ---");
        int count = 0;
        // The lack of a loop means we must explicitly write each step if we want to run code multiple times

        if (count < 3) {
            System.out.println("Step 1");
            count++; // Increment
        }
        // The next if is a new check, it does not loop back to the first
        if (count < 3) {
            System.out.println("Step 2");
            count++;
        }
        if (count < 3) {
            System.out.println("Step 3");
            count++;
        }
    }
}
