let gl;
let canvas;
let drawMode = 'point'; // Default mode is drawing points
let shapesList = [];

// Color and size values from sliders
let rValue = 1.0, gValue = 0.0, bValue = 0.0, pointSize = 10.0;
let circleSegments = 30; // Default number of segments for circle

// Shader sources
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

// Shape Classes
class Point {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
    }

    render(gl, a_Position, u_FragColor, u_PointSize) {
        // Set the point size (ensure it’s valid)
        const validPointSize = Math.max(1, Math.min(this.size, 100)); // Ensure it's between 1 and 100

        gl.vertexAttrib3f(a_Position, this.x, this.y, 0.0);
        gl.uniform4f(u_FragColor, ...this.color);
        gl.uniform1f(u_PointSize, validPointSize); // Use the valid point size

        gl.drawArrays(gl.POINTS, 0, 1);
    }
}

class Triangle {
    constructor(x1, y1, x2, y2, x3, y3, color) {
        this.vertices = [
            x1, y1, 0.0,
            x2, y2, 0.0,
            x3, y3, 0.0
        ];
        this.color = color;
    }

    render(gl, a_Position, u_FragColor) {
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        gl.uniform4f(u_FragColor, ...this.color);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

class Circle {
    constructor(x, y, radius, color, segments) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.segments = segments;
        this.vertices = this.generateCircleVertices();
    }

    generateCircleVertices() {
        let vertices = [];
        const angleStep = 2 * Math.PI / this.segments;
        for (let i = 0; i < this.segments; i++) {
            const angle = i * angleStep;
            vertices.push(
                this.x + this.radius * Math.cos(angle),
                this.y + this.radius * Math.sin(angle),
                0.0
            );
        }
        return vertices;
    }

    render(gl, a_Position, u_FragColor) {
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        gl.uniform4f(u_FragColor, ...this.color);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.segments);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

// Main Setup and Rendering
function main() {
    const { canvas: canvasElement, glContext } = setupWebGL();
    canvas = canvasElement;
    gl = glContext;
    if (!gl) return;

    const { a_Position, u_FragColor, u_PointSize } = connectVariablesToGLSL(gl);
    initializeMouseEvents(a_Position, u_FragColor, u_PointSize);
    initializeSliders();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    setupModeButtons();
}

// Setup WebGL context and canvas
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

// Handle mouse click to add shapes in the current mode
function handleMouseClick(ev, gl, a_Position, u_FragColor, u_PointSize) {
    const { x, y } = getNormalizedCoords(ev, canvas);

    let shape;
    if (drawMode === 'point') {
        shape = new Point(x, y, [rValue, gValue, bValue, 1.0], pointSize);
        console.log(drawMode, "@", x, y);
    } else if (drawMode === 'triangle') {
        const size = pointSize / 100;
        shape = new Triangle(
            x - size, y - size,
            x + size, y - size,
            x, y + size,
            [rValue, gValue, bValue, 1.0]
        );
        console.log(drawMode, "@", x, y);
    } else if (drawMode === 'circle') {
        shape = new Circle(x, y, pointSize / 100, [rValue, gValue, bValue, 1.0], circleSegments);
        console.log(drawMode, "@", x, y);
    }

    if (shape) {
        shapesList.push(shape);
        renderAllShapes(gl, a_Position, u_FragColor, u_PointSize);
    }
}

// Normalize mouse coordinates to WebGL space
function getNormalizedCoords(ev, canvas) {
    const rect = ev.target.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) - canvas.width / 2) / (canvas.width / 2);
    const y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);
    return { x, y };
}

// Render all shapes in the shapes list
function renderAllShapes(gl, a_Position, u_FragColor, u_PointSize) {
    shapesList.forEach(shape => shape.render(gl, a_Position, u_FragColor, u_PointSize));
}

// Initialize sliders for color and size
function initializeSliders() {
    const sliders = [
        { id: 'rSlider', update: val => (rValue = val / 255.0), valueId: 'rSliderValue' },
        { id: 'gSlider', update: val => (gValue = val / 255.0), valueId: 'gSliderValue' },
        { id: 'bSlider', update: val => (bValue = val / 255.0), valueId: 'bSliderValue' },
        { id: 'sizeSlider', update: val => (pointSize = val), valueId: 'sizeSliderValue' },
        { id: 'circleSegmentsSlider', update: val => (circleSegments = val), valueId: 'circleSegmentsSliderValue' }
    ];

    sliders.forEach(slider => {
        const el = document.getElementById(slider.id);
        const valueElement = document.getElementById(slider.valueId);
        el.addEventListener('input', function () {
            slider.update(this.value);
            valueElement.textContent = this.value; // Update the displayed value
        });
        
        // Set the initial value display when the page loads
        valueElement.textContent = el.value;
    });
}

// Setup event listeners for mode buttons
function setupModeButtons() {
    document.getElementById('clearButton').addEventListener('click', clearCanvas);
    document.getElementById('pointButton').addEventListener('click', () => switchMode('point'));
    document.getElementById('triangleButton').addEventListener('click', () => switchMode('triangle'));
    document.getElementById('circleButton').addEventListener('click', () => switchMode('circle'));
}

// Switch drawing mode without clearing the canvas
function switchMode(mode) {
    drawMode = mode;
    console.log(`Switched to ${drawMode} mode`);
}

// Clear the canvas and reset the shapes list
function clearCanvas() {
    shapesList = [];
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Initialize mouse events
function initializeMouseEvents(a_Position, u_FragColor, u_PointSize) {
    canvas.onmousedown = ev => handleMouseClick(ev, gl, a_Position, u_FragColor, u_PointSize);
    canvas.onmousemove = ev => {
        if (ev.buttons === 1 && drawMode !== 'none') {
            handleMouseClick(ev, gl, a_Position, u_FragColor, u_PointSize);
        }
    };
}

window.onload = main;