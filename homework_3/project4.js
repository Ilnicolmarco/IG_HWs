// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	// Rotazione X
    var cX = Math.cos(rotationX), sX = Math.sin(rotationX); //sono in radianti
    var rotX = [
        1,   0,   0,  0,
        0,  cX,  sX,  0,
        0, -sX,  cX,  0,
        0,   0,   0,  1
    ];

    // Rotazione Y
    var cY = Math.cos(rotationY), sY = Math.sin(rotationY);//sono in radianti
    var rotY = [
         cY,  0, -sY,  0,
          0,  1,   0,  0,
         sY,  0,  cY,  0,
          0,  0,   0,  1
    ];

    // Traslazione
    var trans = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];

    // M = T * R_y * R_x
    var rotXY= MatrixMult(rotY, rotX); // R_y * R_x
    var m = MatrixMult(trans, rotXY); // T * (R_y*R_x)

    // Proiezione MP = P * M
    var mp = MatrixMult(projectionMatrix, m);

    return mp;
}

class MeshDrawer
{
	constructor() {
		this.gl = gl; //
	
		// vertex shader
		const vsSource = `
			attribute vec3 a_position; 	//posizione
			attribute vec2 a_texcoord; 	//texture
			uniform mat4 u_mp; 			//transformation matrix
			uniform bool u_swapYZ; 		//flag swap YZ
			varying vec2 v_texcoord;	//variabile per uv
			void main() {
				vec3 pos = a_position;	//legge posizione
				if (u_swapYZ) pos = vec3(pos.x, pos.z, pos.y); //se swap swappa y e z
				gl_Position = u_mp * vec4(pos, 1.0);	//applico MP
				v_texcoord = a_texcoord;				//passo uv al fragment shader
			}
			`;

		// Fragment shader
		const fsSource = `
			precision mediump float;	//precisione
			varying vec2 v_texcoord;	//variabile per uv
			uniform bool u_useTexture;	//flag texture
			uniform sampler2D u_texture; //texture 2d
			void main() {
				if (u_useTexture) {
				gl_FragColor = texture2D(u_texture, v_texcoord);	//prendo colore texture
				} else {
				float d = gl_FragCoord.z;	//estraggo profondità
				gl_FragColor = vec4(1.0, d*d, 0.0, 1.0);	//scelgo il colore in base alla profondità
				}
			}
			`;
	  
		  // link tra vs e fs, restituisce il program
		  this.prog = InitShaderProgram(vsSource, fsSource);
		  gl.useProgram(this.prog);
	  
		  //estraggo variabili
		  this.u_mp        = gl.getUniformLocation(this.prog, "u_mp");
		  this.u_swapYZ     = gl.getUniformLocation(this.prog, "u_swapYZ");
		  this.u_useTexture = gl.getUniformLocation(this.prog, "u_useTexture");
		  this.u_texture    = gl.getUniformLocation(this.prog, "u_texture");
		  this.a_position   = gl.getAttribLocation(this.prog, "a_position");
		  this.a_texcoord   = gl.getAttribLocation(this.prog, "a_texcoord");
	  
		  // creo i buffer posizione e texture
		  this.posBuffer = gl.createBuffer();
		  this.texBuffer = gl.createBuffer();
	  
		  // Stato iniziale
		  this.numVertices = 0; 	//non disegno vertici
		  this.doSwapYZ    = false;	//flag swap no
		  this.doUseTex    = false;	//flag texture disabilitato [TODO: rivedere]
		  this.texture     = null;	//texture nulla
		  
		  gl.enable(gl.DEPTH_TEST);	//abilito il depth test

		}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords) {
		const gl = this.gl;
	
		// collego i buffer delle posizioni
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.bufferData(gl.ARRAY_BUFFER,
					  new Float32Array(vertPos),
					  gl.STATIC_DRAW);
	
		//log di verifica
		console.log("Vertices:", this.numVertices,
			"Bytes in posBuffer:",
			gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE));
						  
	
		// collego i buffer della texture
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER,
					  new Float32Array(texCoords),
					  gl.STATIC_DRAW);
	
		//log di verifica
		console.log("UV bytes in texBuffer:",
                    gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE));
			
		// Divido l'array per 3 componenti e ottengo il numero di vertici
		this.numVertices = vertPos.length / 3;
	  }
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ(swap) {
		this.doSwapYZ = swap; //nuovo stato del flag
	  }
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		const gl = this.gl;
		gl.useProgram(this.prog);
	
		// carico la matrice e il flag di swap
		gl.uniformMatrix4fv(this.u_mp, false, trans);
		gl.uniform1i(this.u_swapYZ, this.doSwapYZ ? 1 : 0);
	
		// Se ho texture flaggato uso la texture
		gl.uniform1i(this.u_useTexture, this.doUseTex ? 1 : 0);
		if (this.doUseTex && this.texture) {
		  gl.activeTexture(gl.TEXTURE0);				
		  gl.bindTexture(gl.TEXTURE_2D, this.texture);	
		  gl.uniform1i(this.u_texture, 0);				
		}
	
		// posizione
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.enableVertexAttribArray(this.a_position);
		gl.vertexAttribPointer(
		  this.a_position,  // location
		  3,                // x,y,z
		  gl.FLOAT,         // tipo
		  false,            // non normalizzato
		  0,                
		  0                
		);
	
		// UV
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.enableVertexAttribArray(this.a_texcoord);
		gl.vertexAttribPointer(
		  this.a_texcoord,  // location
		  2,                // uv
		  gl.FLOAT,
		  false,
		  0,
		  0
		);
	
		// disegno i triangoli
		gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
	
	  }
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		const gl = this.gl;
		
		//creo e bindo la texture
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	  
		// carico i dati nella texture
		gl.texImage2D(
		  gl.TEXTURE_2D, 0,
		  gl.RGBA, gl.RGBA,
		  gl.UNSIGNED_BYTE,
		  img				//elemento html passato come argomento
		);
	  
		// In caso di immagini di dimensioni non potenze di due 
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	  
		// Scollega per poter poi cambiare texture
		gl.bindTexture(gl.TEXTURE_2D, null);
	  }
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture(show) {
		this.doUseTex = show //nuovo stato del flag
	}
	
}
