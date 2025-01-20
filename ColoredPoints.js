// Global variable for WebGL context
let gl;

// Vertex shader program
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'uniform float u_PointSize;\n' + // Uniform for point size
    'void main() {\n' +
    '  gl_Position = a_Position;\n' +
    '  gl_PointSize = u_PointSize;\n' + // Use uniform variable for point size
    '}\n';

// Fragment shader program
var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' + // Uniform variable for color
    'void main() {\n' +
    '  gl_FragColor = u_FragColor;\n' +
    '}\n';

// Global list to store all shapes (points and triangles)
var shapesList = [];
var drawMode = 'point';  // Default mode is drawing points

// RGB color values from sliders
var rValue = 1.0; // Default red value (from slider)
var gValue = 0.0; // Default green value (from slider)
var bValue = 0.0; // Default blue value (from slider)
var pointSize = 10.0; // Default point size

// Point class to store point data (position, color, size)
class Point {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
    }

    // Render method to draw the point
    render(gl, a_Position, u_FragColor, u_PointSize) {
        gl.vertexAttrib3f(a_Position, this.x, this.y, 0.0);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniform1f(u_PointSize, this.size); // Set the point size
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}

// Triangle class to store triangle data (three vertices, color)
class Triangle {
    constructor(x1, y1, x2, y2, x3, y3, color) {
        this.vertices = [
            x1, y1, 0.0,  // First vertex
            x2, y2, 0.0,  // Second vertex
            x3, y3, 0.0   // Third vertex
        ];
        this.color = color;
    }

    // Render method to draw the triangle
    render(gl, a_Position, u_FragColor) {
        // Bind and buffer the vertex data
        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        // Point to the position attribute
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Set the color for the triangle
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

        // Draw the triangle
        gl.drawArrays(gl.TRIANGLES, 0, 3); // Draw the three vertices as a triangle
    }
}

// Main function to run when the page loads
function main() {
    var { canvas, glContext } = setupWebGL();  // Setup the WebGL context and canvas
    gl = glContext;  // Assign the WebGL context to the global variable
    if (!gl) return; // If WebGL is not initialized, return early

    // Connect variables to GLSL
    var { a_Position, u_FragColor, u_PointSize } = connectVariablesToGLSL(gl);

    // Register function to handle mouse clicks
    canvas.onmousedown = function(ev) {
        handleClicks(ev, gl, canvas, a_Position, u_FragColor, u_PointSize);
    };
    canvas.onmousemove = function(ev) {
        if (ev.buttons == 1) {
            handleClicks(ev, gl, canvas, a_Position, u_FragColor, u_PointSize);
        }
    };

    // Update the color and size from the sliders
    updateColorFromSliders();
    updateSizeFromSlider();

    // Clear the canvas with black color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update slider event listeners
    document.getElementById('rSlider').addEventListener('input', function() {
        rValue = this.value / 255.0; // Scale the value to range 0.0 - 1.0
        document.getElementById('rValue').textContent = this.value;
        updateColorFromSliders();
    });

    document.getElementById('gSlider').addEventListener('input', function() {
        gValue = this.value / 255.0; // Scale the value to range 0.0 - 1.0
        document.getElementById('gValue').textContent = this.value;
        updateColorFromSliders();
    });

    document.getElementById('bSlider').addEventListener('input', function() {
        bValue = this.value / 255.0; // Scale the value to range 0.0 - 1.0
        document.getElementById('bValue').textContent = this.value;
        updateColorFromSliders();
    });

    document.getElementById('sizeSlider').addEventListener('input', function() {
        pointSize = this.value; // Get the point size from the slider
        document.getElementById('sizeValue').textContent = this.value;
        updateSizeFromSlider();
    });

    // Register the clear button to clear the canvas
    document.getElementById('clearButton').addEventListener('click', function() {
        clearCanvas(); // Use global gl variable
    });

    // Register the mode buttons
    document.getElementById('pointButton').addEventListener('click', function() {
        drawMode = 'point';  // Set mode to point
        // Don't clear shapes, just re-render them
        renderAllShapes(gl, a_Position, u_FragColor, u_PointSize);
    });

    document.getElementById('triangleButton').addEventListener('click', function() {
        drawMode = 'triangle';  // Set mode to triangle
        // Don't clear shapes, just re-render them
        renderAllShapes(gl, a_Position, u_FragColor, u_PointSize);
    });
}

// Function to set up WebGL context and canvas
function setupWebGL() {
    var canvas = document.getElementById('webgl');
    var gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });  // Improved performance with preserveDrawingBuffer
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return {};
    }
    return { canvas: canvas, glContext: gl };
}

// Compile shaders and connect JavaScript variables to GLSL variables
function connectVariablesToGLSL(gl) {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return null;
    }

    // Get attribute and uniform variable locations
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return null;
    }

    var u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return null;
    }

    var u_PointSize = gl.getUniformLocation(gl.program, 'u_PointSize');
    if (!u_PointSize) {
        console.log('Failed to get the storage location of u_PointSize');
        return null;
    }

    return { a_Position: a_Position, u_FragColor: u_FragColor, u_PointSize: u_PointSize };
}

// Handle mouse clicks and store the position, color, and size of the clicked shapes
function handleClicks(ev, gl, canvas, a_Position, u_FragColor, u_PointSize) {
    var x = ev.clientX;  // x coordinate of mouse pointer
    var y = ev.clientY;  // y coordinate of mouse pointer
    var rect = ev.target.getBoundingClientRect();

    // Normalize coordinates to WebGL coordinates
    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2); // Convert to WebGL coordinates (-1 to 1)
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);  // Convert to WebGL coordinates (-1 to 1)

    if (drawMode === 'point') {
        var newPoint = new Point(x, y, [rValue, gValue, bValue, 1.0], pointSize);
        shapesList.push(newPoint);
    } else if (drawMode === 'triangle') {
        // Example of drawing a triangle; modify coordinates for different triangles
        var size = pointSize / 100; // Scale triangle size based on point size
        var newTriangle = new Triangle(
            x - size, y - size,
            x + size, y - size,
            x, y + size,
            [rValue, gValue, bValue, 1.0]
        );
        shapesList.push(newTriangle);
    }

    // Render all shapes
    renderAllShapes(gl, a_Position, u_FragColor, u_PointSize);
}

// Render all shapes (points and triangles) based on the stored data
function renderAllShapes(gl, a_Position, u_FragColor, u_PointSize) {
    gl.clear(gl.COLOR_BUFFER_BIT); // Clear the canvas once per frame

    for (var i = 0; i < shapesList.length; i++) {
        shapesList[i].render(gl, a_Position, u_FragColor, u_PointSize);
    }
}

// Function to update the color based on slider values
function updateColorFromSliders() {
    rValue = document.getElementById('rSlider').value / 255.0; // Scale to 0.0 - 1.0
    gValue = document.getElementById('gSlider').value / 255.0; // Scale to 0.0 - 1.0
    bValue = document.getElementById('bSlider').value / 255.0; // Scale to 0.0 - 1.0
}

// Function to update the size based on the slider value
function updateSizeFromSlider() {
    pointSize = document.getElementById('sizeSlider').value;
}

// Function to clear the canvas
function clearCanvas() {
    shapesList = []; // Empty the shapesList
    gl.clear(gl.COLOR_BUFFER_BIT); // Clear the canvas
}