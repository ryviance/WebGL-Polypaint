let gl;
let canvas;
let drawMode = 'point'; // Default mode is drawing points
let shapesList = [];

// Vertex and Fragment Shader Programs
const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform float u_PointSize;
    void main() {
        gl_Position = a_Position;
        gl_PointSize = u_PointSize;
    }
`;

const FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }
`;

// Color and size values from sliders
let rValue = 1.0, gValue = 0.0, bValue = 0.0, pointSize = 10.0;

// Point and Triangle Classes
class Point {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
    }

    render(gl, a_Position, u_FragColor, u_PointSize) {
        gl.vertexAttrib3f(a_Position, this.x, this.y, 0.0);
        gl.uniform4f(u_FragColor, ...this.color);
        gl.uniform1f(u_PointSize, this.size);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}

class Triangle {
    constructor(x1, y1, x2, y2, x3, y3, color, size) {
        this.vertices = [
            x1, y1, 0.0,
            x2, y2, 0.0,
            x3, y3, 0.0
        ];
        this.color = color;
        this.size = size;  // Add size to control triangle size
    }

    render(gl, a_Position, u_FragColor) {
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        gl.uniform4f(u_FragColor, ...this.color);

        // Render triangle, make sure it's a visible size
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

// Main function to set up WebGL and handle user interactions
function main() {
    const { canvas: canvasElement, glContext } = setupWebGL();
    canvas = canvasElement;
    gl = glContext;
    if (!gl) return;

    const { a_Position, u_FragColor, u_PointSize } = connectVariablesToGLSL(gl);

    // Initialize event listeners based on the active mode
    updateMouseEventListeners(a_Position, u_FragColor, u_PointSize);

    initializeSliders();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    setupModeButtons(a_Position, u_FragColor, u_PointSize);
}

// Set up WebGL context and canvas
function setupWebGL() {
    const canvas = document.getElementById('webgl');
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to get WebGL context.');
        return {};
    }
    return { canvas, glContext: gl };
}

// Connect shader variables to GLSL programs
function connectVariablesToGLSL(gl) {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return null;
    }

    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    const u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    const u_PointSize = gl.getUniformLocation(gl.program, 'u_PointSize');

    return { a_Position, u_FragColor, u_PointSize };
}

// Handle mouse click for adding shapes in the active mode
function handleMouseClick(ev, gl, a_Position, u_FragColor, u_PointSize) {
    const { x, y } = getNormalizedCoords(ev, canvas);
    console.log(`Mouse clicked at normalized coordinates: (${x}, ${y})`);

    if (drawMode === 'point') {
        console.log("Adding point to shapesList");
        shapesList.push(new Point(x, y, [rValue, gValue, bValue, 1.0], pointSize));
    } else if (drawMode === 'triangle') {
        const size = pointSize / 100;  // Adjust the size multiplier to increase visibility
        console.log("Adding triangle to shapesList");
        shapesList.push(new Triangle(x - size, y - size, x + size, y - size, x, y + size, [rValue, gValue, bValue, 1.0], size));
    }

    renderAllShapes(gl, a_Position, u_FragColor, u_PointSize);
}

// Normalize mouse coordinates to WebGL space
function getNormalizedCoords(ev, canvas) {
    const rect = ev.target.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) - canvas.width / 2) / (canvas.width / 2);
    const y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);
    return { x, y };
}

// Render all shapes (both points and triangles)
function renderAllShapes(gl, a_Position, u_FragColor, u_PointSize) {
    console.log("Rendering all shapes");

    for (const shape of shapesList) {
        shape.render(gl, a_Position, u_FragColor, u_PointSize);
    }
}

// Initialize sliders for color and size
function initializeSliders() {
    const sliders = [
        { id: 'rSlider', update: val => (rValue = val / 255.0) },
        { id: 'gSlider', update: val => (gValue = val / 255.0) },
        { id: 'bSlider', update: val => (bValue = val / 255.0) },
        { id: 'sizeSlider', update: val => (pointSize = val) }
    ];

    sliders.forEach(slider => {
        const el = document.getElementById(slider.id);
        el.addEventListener('input', function () {
            slider.update(this.value);
            const valueElement = document.getElementById(slider.id + 'Value');
            if (valueElement) {
                valueElement.textContent = this.value;
            }
        });
    });
}

// Set up event listeners for mode buttons
function setupModeButtons(a_Position, u_FragColor, u_PointSize) {
    document.getElementById('clearButton').addEventListener('click', clearCanvas);
    document.getElementById('pointButton').addEventListener('click', () => switchMode('point', a_Position, u_FragColor, u_PointSize));
    document.getElementById('triangleButton').addEventListener('click', () => switchMode('triangle', a_Position, u_FragColor, u_PointSize));
}

// Switch between point and triangle drawing modes
function switchMode(mode, a_Position, u_FragColor, u_PointSize) {
    drawMode = mode;
    console.log(`Switched to ${drawMode} mode`); // Log the current mode
    updateMouseEventListeners(a_Position, u_FragColor, u_PointSize);
    renderAllShapes(gl, a_Position, u_FragColor, u_PointSize);  // Ensure to re-render all shapes after switching mode
}

// Update mouse event listeners based on active mode
function updateMouseEventListeners(a_Position, u_FragColor, u_PointSize) {
    canvas.onmousedown = null;
    canvas.onmousemove = null;

    if (drawMode === 'point') {
        canvas.onmousedown = ev => handleMouseClick(ev, gl, a_Position, u_FragColor, u_PointSize);
        canvas.onmousemove = ev => ev.buttons === 1 && handleMouseClick(ev, gl, a_Position, u_FragColor, u_PointSize);
    } else if (drawMode === 'triangle') {
        canvas.onmousedown = ev => handleMouseClick(ev, gl, a_Position, u_FragColor, u_PointSize);
        canvas.onmousemove = ev => ev.buttons === 1 && handleMouseClick(ev, gl, a_Position, u_FragColor, u_PointSize);
    }
}

// Clear the canvas and reset shapes list
function clearCanvas() {
    shapesList = [];
    gl.clear(gl.COLOR_BUFFER_BIT);
}