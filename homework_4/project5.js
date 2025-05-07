// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
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

    return m;
}



class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
        this.gl = gl;

		// vertex shader
        const vsSource = `
            attribute vec3 a_position;	//posizione
			attribute vec2 a_texcoord; 	//texture
            attribute vec3 a_normal;	//normale
            uniform mat4 u_mp; 			//transformation matrix con proiezione
            uniform mat4 u_mv;			//transformation matrix
            uniform mat3 u_normalMatrix;//transformation matrix normale
            uniform bool u_swapYZ; 		//flag swap YZ
            varying vec2 v_texcoord;	//variabile per uv
            varying vec3 v_normal;		//variabile per normale
            varying vec3 v_fragPos;		//variabile posizione per camera
            void main() {
                vec3 pos = a_position;	//legge posizione
                if (u_swapYZ) pos = vec3(pos.x, pos.z, pos.y); //se swap swappa y e z
                vec4 pos4 = vec4(pos, 1.0);
                gl_Position = u_mp * pos4;	//applico MP
                v_texcoord = a_texcoord;				//passo uv al fragment shader
                v_fragPos = vec3(u_mv * pos4); 			// trasforma la posizione in spazio camera
                v_normal = normalize(u_normalMatrix * (u_swapYZ ? vec3(a_normal.x, a_normal.z, a_normal.y) : a_normal)); //normale per camera
            }
        `;

		// Fragment shader
        const fsSource = `
            precision mediump float;	//precisione
            varying vec2 v_texcoord;	//variabile per uv
            varying vec3 v_normal;		//variabile per normale
            varying vec3 v_fragPos;		//variabile posizione per camera
            uniform bool u_useTexture;	//flag texture
            uniform sampler2D u_texture; //texture 2d
            uniform vec3 u_lightDir;	//direzione luce
            uniform float u_shininess;	//shiness
            void main() {
                vec3 N = normalize(v_normal);	//normalizza luce
                vec3 L = normalize(u_lightDir);	//normalizza direzione luce
                vec3 V = normalize(-v_fragPos);	//normalizza direzione occhio
                vec3 H = normalize(L + V);		//normalizza vettore luce occhio

                float diff = max(dot(N, L), 0.0); //diffusione della luce {scalare N e L, max per via dell'angolo}
                float spec = pow(max(dot(N, H), 0.0), u_shininess);	//componente speculare

                vec3 Kd = u_useTexture ? texture2D(u_texture, v_texcoord).rgb : vec3(1.0); //colore diffuso nella texture
                vec3 Ks = vec3(1.0);	//bianco

                vec3 color = Kd * diff + Ks * spec; //sommo le due componenti
                gl_FragColor = vec4(color, 1.0); //colore finale
            }
        `;

		// link tra vs e fs, restituisce il program
        this.prog = InitShaderProgram(vsSource, fsSource);
        gl.useProgram(this.prog);

		//estraggo variabili
        this.a_position = gl.getAttribLocation(this.prog, "a_position");
        this.a_texcoord = gl.getAttribLocation(this.prog, "a_texcoord");
        this.a_normal   = gl.getAttribLocation(this.prog, "a_normal");

        this.u_mp           = gl.getUniformLocation(this.prog, "u_mp");
        this.u_mv            = gl.getUniformLocation(this.prog, "u_mv");
        this.u_normalMatrix  = gl.getUniformLocation(this.prog, "u_normalMatrix");
        this.u_swapYZ        = gl.getUniformLocation(this.prog, "u_swapYZ");
        this.u_useTexture    = gl.getUniformLocation(this.prog, "u_useTexture");
        this.u_texture       = gl.getUniformLocation(this.prog, "u_texture");
        this.u_lightDir      = gl.getUniformLocation(this.prog, "u_lightDir");
        this.u_shininess     = gl.getUniformLocation(this.prog, "u_shininess");

		// creo i buffer posizione e texture
        this.posBuffer   = gl.createBuffer();
        this.texBuffer   = gl.createBuffer();
        this.normBuffer  = gl.createBuffer();

		// Stato iniziale
        this.numVertices = 0; 	//non disegno vertici
        this.doSwapYZ = false;	//flag swap no
        this.doUseTex = false;	//flag texture disabilitato [TODO: rivedere]
        this.texture = null;	//texture nulla
        this.lightDir = [0.0, 0.0, -1.0]; //luce iniziale
        this.shininess = 32.0;	//shininess iniziale

        gl.enable(gl.DEPTH_TEST);	//abilito il depth test
    }

	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords, normals) {
        this.numVertices = vertPos.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    }
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ(swap) {
		this.doSwapYZ = swap; //nuovo stato del flag
	  }
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixmp,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw(matrixmp, matrixMV, matrixNormal) {
        gl.useProgram(this.prog);

		//passo le matrici di trasformazione
        gl.uniformMatrix4fv(this.u_mp, false, matrixmp);
        gl.uniformMatrix4fv(this.u_mv, false, matrixMV);
        gl.uniformMatrix3fv(this.u_normalMatrix, false, matrixNormal);
		//in base ai flag e ai cursori...
        gl.uniform1i(this.u_swapYZ, this.doSwapYZ);
        gl.uniform1i(this.u_useTexture, this.doUseTex);
        gl.uniform3fv(this.u_lightDir, this.lightDir);
        gl.uniform1f(this.u_shininess, this.shininess);

		//Se ho scelto la texture...
        if (this.doUseTex && this.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.uniform1i(this.u_texture, 0);
        }

		//collego il buffer delle posizioni
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.vertexAttribPointer(this.a_position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.a_position);

		//collego il buffer delle coordinate della texture, uv
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        gl.vertexAttribPointer(this.a_texcoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.a_texcoord);

		//collego il buffer delle normali
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
        gl.vertexAttribPointer(this.a_normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.a_normal);

		//diesgno i triangoli
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
	
	// This method is called to set the incoming light direction
	setLightDir(x, y, z) {
        this.lightDir = [x, y, z]; //in base al cursore vario le direzioni della luce
    }
	
	// This method is called to set the shininess of the material
	setShininess(shininess) {
        this.shininess = shininess; //nuovo stato del flag
    }
}
