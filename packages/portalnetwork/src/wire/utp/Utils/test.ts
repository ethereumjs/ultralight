enum packT {
    a = 12,
    b = 2
}

let ver = 1;

let p = packT.a.toString(16);
let v = ver.toString(16);
let pandv = p+v;
let int = parseInt(pandv, 16);

let b = Buffer.of(int)

let u = b[0];

let hex = u.toString(16);

let t = hex[0];
let w = hex[1];


console.log(packT.a)
console.log(ver)
console.log(p)
console.log(v)
console.log(pandv);
console.log(int);
console.log(hex)
console.log(t)
console.log(w)
console.log(parseInt(t,16))

