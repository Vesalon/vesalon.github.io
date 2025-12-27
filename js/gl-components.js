// WebGL utility functions and shader management

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

function createProgramFromSources(gl, vsSource, fsSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    return createProgram(gl, vertexShader, fragmentShader);
}

// Vertex shader - transforms vertices
const vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    
    void main() {
        // Convert from pixels to clip space (-1 to 1)
        vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
        // Flip Y axis (WebGL Y is up, canvas Y is down)
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
`;

// Fragment shader - colors the pixels
const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    
    void main() {
        gl_FragColor = u_color;
    }
`;

// Line drawing class for WebGL
class GLLineRenderer {
    constructor(gl) {
        this.gl = gl;
        this.program = createProgramFromSources(gl, vertexShaderSource, fragmentShaderSource);
        
        // Get attribute and uniform locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
        this.colorLocation = gl.getUniformLocation(this.program, 'u_color');
        
        // Create buffer for vertices
        this.positionBuffer = gl.createBuffer();
        
        // Line vertices array (will be populated each frame)
        this.vertices = [];
    }
    
    begin() {
        this.vertices = [];
    }
    
    addLine(x0, y0, x1, y1) {
        this.vertices.push(x0, y0, x1, y1);
    }
    
    addPolyline(points) {
        // points is array of [x, y] pairs
        for (let i = 0; i < points.length - 1; i++) {
            this.addLine(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
        }
    }
    
    render(resolutionWidth, resolutionHeight, color = [1, 1, 1, 1]) {
        const gl = this.gl;
        
        if (this.vertices.length === 0) return;
        
        gl.useProgram(this.program);
        
        // Set resolution
        gl.uniform2f(this.resolutionLocation, resolutionWidth, resolutionHeight);
        
        // Set color
        gl.uniform4fv(this.colorLocation, color);
        
        // Bind and fill buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
        
        // Enable attribute
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Draw lines
        gl.drawArrays(gl.LINES, 0, this.vertices.length / 2);
    }
}

// More advanced line renderer with varying colors per vertex
const colorVertexShaderSource = `
    attribute vec2 a_position;
    attribute vec4 a_color;
    uniform vec2 u_resolution;
    varying vec4 v_color;
    
    void main() {
        vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_color = a_color;
    }
`;

const colorFragmentShaderSource = `
    precision mediump float;
    varying vec4 v_color;
    
    void main() {
        gl_FragColor = v_color;
    }
`;

class GLColorLineRenderer {
    constructor(gl) {
        this.gl = gl;
        this.program = createProgramFromSources(gl, colorVertexShaderSource, colorFragmentShaderSource);
        
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.colorLocation = gl.getAttribLocation(this.program, 'a_color');
        this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
        
        this.positionBuffer = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();
        
        this.positions = [];
        this.colors = [];
    }
    
    begin() {
        this.positions = [];
        this.colors = [];
    }
    
    addLine(x0, y0, x1, y1, color = [1, 1, 1, 1]) {
        this.positions.push(x0, y0, x1, y1);
        // Add color for both vertices
        this.colors.push(...color, ...color);
    }
    
    addPolyline(points, color = [1, 1, 1, 1]) {
        for (let i = 0; i < points.length - 1; i++) {
            this.addLine(points[i][0], points[i][1], points[i+1][0], points[i+1][1], color);
        }
    }
    
    render(resolutionWidth, resolutionHeight) {
        const gl = this.gl;
        
        if (this.positions.length === 0) return;
        
        gl.useProgram(this.program);
        
        gl.uniform2f(this.resolutionLocation, resolutionWidth, resolutionHeight);
        
        // Position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.colorLocation);
        gl.vertexAttribPointer(this.colorLocation, 4, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.LINES, 0, this.positions.length / 2);
    }
}
