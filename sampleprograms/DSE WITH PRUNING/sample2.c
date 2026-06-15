//This Program is Problem4-REACHABILITY-TRAINING-RERS18.c
#include <stdio.h>
#define BOUND 4
int kappa;

int input,output;
#include <assert.h>
#include <math.h>
#include <stdlib.h>
// #include <klee/klee.h>

	// inputs
	int inputs[] = {5,1,3,2,4};

	int errorCheck();
	int calculate_output(int);
	int calculate_outputm3(int);
	int calculate_outputm56(int);
	


	int cf = 1;
	int a1631914830 = 4;
	int a653455892 = 4;
	int a875425738 = 7;
	int a1137288446  = 36;
	int a625968089  = 35;

 int calculate_outputm56(int input) {
    if((((a875425738 == 6 && (a1631914830 == 1 &&  cf==1 )) && a1137288446 == 34) && (input == 1))) {
printf("POINT: 224\n");
    	cf = 0;
    	a625968089 = 36 ;
    	a875425738 = 9;
    	a653455892 = 2; 
    	 printf("%d\n", 24);  
    } 
}

 int calculate_outputm3(int input) {
printf("POINT: 225\n");

    if((a1631914830 == 1 &&  cf==1 )) {
printf("POINT: 226\n");
    	calculate_outputm56(input);
    } 
}

 int calculate_output(int input) {
        cf = 1;

    	if(( cf==1  && a1137288446 == 34)) {
printf("POINT: 482\n");
 	calculate_outputm3(input);
    	} 
    


    if( cf==1 ) {
printf("POINT: 548\n");
}
	
	printf("NEW: %d\n", input);	
	printf("NEW: %d\n",cf);
	printf("NEW: %d\n",a1631914830);
	printf("NEW: %d\n",a653455892);
	printf("NEW: %d\n",a875425738);
	printf("NEW: %d\n",a1137288446);
	printf("NEW: %d\n",a625968089);
	
 }

int input,output;

int main()
{
kappa = 0;
    // main i/o-loop
    int symb;
printf("POINT: 549\n");

   for (int FLAG=0;FLAG < BOUND;FLAG++) {
printf("POINT: 550\n");
klee_make_symbolic(&symb, sizeof(int), "symb");  

        // read input
               
        // operate eca engine
printf("POINT: 551\n");

        if((symb != 5) && (symb != 1) && (symb != 3) && (symb != 2) && (symb != 4)) {
printf("POINT: 552\n");
          return -2;
          }
        calculate_output(symb);
    }
 return 0;

}
