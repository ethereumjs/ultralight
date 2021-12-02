
   export function NumberToUint32(x:number):number 
   {
      return x >>> 0;
   }
   export function NumberToUint16(x:number):number 
   {
      return NumberToUint32(x) & 0xFFFF;
   }
   export function NumberToUint8(x:number):number 
   {
      return NumberToUint32(x) & 0xFF;
   }
   export function NumberToUint4(x:number):number 
   {
      return NumberToUint32(x) & 0xF;
   }

   export function NumberToInt32(x:number): number
   {
      return x >> 0;
   }
   export function NumberToInt16(x:number): number
   {
      let r: number = 0; 
      let n = NumberToUint16(x);
      if(n & 0x8000)
         r =  0xFFFF8000|(n&0x7FFF);
      else 
         r = n;         
      return(r);      
   }
   export function NumberToInt8(x:number): number
   {      
      let r: number = 0; 
      let n = NumberToUint8(x);
      if(n & 0x80)
         r =  0xFFFFFF80|(n&0x7F); 
      else 
         r = n;     
      return(r);      
   }      

   export function StrToNumber(val: string, defaultVal:number = 0): number
   {        
      let result:number = defaultVal;      
      if(val == null) 
         return result;            
      if(val.length == 0) 
         return result;      
      val = val.trim();
      if(val.length == 0) 
         return(result);
      let sign:number = 1;     
      //
      // . obtain sign from string, and place result in "sign" local varible. The Sign naturally defaults to positive
      //     1 for positive, -1 for negative.
      // . remove sign character from val. 
      //      Note, before the function returns, the result is multiplied by the sign local variable to reflect the sign.
      // . error check for multiple sign characters
      // . error check to make sure sign character is at the head or tail of the string
      //              
      {  
         let positiveSignIndex = val.indexOf('+');
         let negativeSignIndex = val.indexOf('-');
         let nTailIndex = val.length-1;
         //
         // make sure both negative and positive signs are not in the string
         //
         if( (positiveSignIndex != -1) && (negativeSignIndex != -1) ) 
             return result;
         //
         // handle postive sign
         //
         if (positiveSignIndex != -1)
         {
            //
            // make sure there is only one sign character
            //
            if( (positiveSignIndex != val.lastIndexOf('+')) )
             return result;     
             //
             // make sure the sign is at the head or tail
             //
             if( (positiveSignIndex > 0) && (positiveSignIndex < nTailIndex )  )
                 return result;
             //
             // remove sign from string
             //
             val = val.replace("+","").trim();                 
         }    
         //
         // handle negative sign
         //
         if (negativeSignIndex != -1)
         {
            //
            // make sure there is only one sign character
            //
            if( (negativeSignIndex != val.lastIndexOf('-')) )
             return result;     
             //
             // make sure the sign is at the head or tail
             //
             if( (negativeSignIndex > 0) && (negativeSignIndex < nTailIndex )  )
                 return result;
             //
             // remove sign from string
             //
             val = val.replace("-","").trim();  
             sign = -1;                 
         }               
         //
         // make sure text length is greater than 0
         //       
         if(val.length == 0) 
            return result;                             
      }   
      //
      // convert string to a number
      //
      var r = +(<any>val);
      //
      // apply sign if no errors
      //
      if( (r != null) && (!isNaN(r)) )
      {          
         result = r*sign;         
        }
        return(result);    
     }
  


  console.log(NumberToInt16(2))