// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform( positionX, positionY, rotation, scale )
{
	//Array( 1, 0, 0, 0, 1, 0, 0, 0, 1 );
	let S=[
		scale,0,0,0,scale,0,0,0,1
	  ]

	let rad = rotation * Math.PI / 180; //cambio in radianti e calcolo seno e coseno
	let cos = Math.cos(rad);
	let sin = Math.sin(rad);


	let R=[
		cos,sin,0,-sin,cos,0,0,0,1
	 ]


	let T = [
		1, 0, 0,
		0, 1, 0,
		positionX, positionY, 1
	];

	let M1= ApplyTransform(S,R); //R*S
	let M2= ApplyTransform(M1,T) //T*R*S
	//console.log(M2)
	return M2
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 )
{
	let result = new Array(9); //3x3
	//per ogni riga
    for (let row = 0; row < 3; row++) {
		//per ogni colonna
        for (let col = 0; col < 3; col++) {
            result[col * 3 + row] =
			trans2[0 * 3 + row]*trans1[col * 3 + 0] +
			trans2[1 * 3 + row]*trans1[col * 3 + 1] +
            trans2[2 * 3 + row]*trans2[col * 3 + 2];
        }
    }
    return result;
}
