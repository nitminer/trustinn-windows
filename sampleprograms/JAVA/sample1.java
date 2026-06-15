public class sample1 {
    
        

 public static void main(String args[]){
        int n=8;
        int a[]={8,4,5,3,2,6,9,1};
        if(n==0){
            
            System.out.println("NULL");
         }

         for(int i=0;i<n;i++){
         int suml=0;
         int sums=0;
           
           for(int j=i+1;j<n;j++){
        if(a[j]<a[i]){
                     suml=suml+a[j];
                    }
                 else{
                     sums=sums+a[j];
                     }
             }
        a[i]=suml*sums;
    }
   
    for(int i=0;i<n-2;i++)
        System.out.println(a[i]);
        
  
 }
}
    
