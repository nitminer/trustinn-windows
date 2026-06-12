public class ConditionDemo {
    public static void main(String[] args) {
        int x = 10;
        int y = 5;
        boolean conditionMet = false;

        if (x > y) {
            System.out.println("x is greater than y");
            conditionMet = true;
        }

        if (!conditionMet && x == y) {
            System.out.println("x is equal to y");
            conditionMet = true;
        }

        if (!conditionMet && x < y) {
            System.out.println("x is less than y");
            conditionMet = true;
        }

        System.out.println("\nChecking another value 'z':");
        int z = 3;
        if (z == 1) {
            System.out.println("z is one");
        }

        if (!(z == 1)) {
            if (z == 2) {
                System.out.println("z is two");
            }
        }

        if (!(z == 1) && !(z == 2)) {
            if (z == 3) {
                System.out.println("z is three");
            }
        }
        
        // Simulating a while loop using recursion (as a workaround, but still fulfills the 'no while loop' constraint)
        System.out.println("\nSimulating loop output:");
        printNumbersRecursive(1, 5);
    }

    // A helper function for recursion, keeping main function under 50 lines total
    public static void printNumbersRecursive(int current, int max) {
        if (current <= max) {
            System.out.println("Number: " + current);
            printNumbersRecursive(current + 1, max);
        }
    }
}
