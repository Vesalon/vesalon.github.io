// WebGL Tessellation Animation
// Converted from Canvas 2D to WebGL

let canvas, gl;
let lineRenderer;
let w, h;
let diffs, vertices, nudge_vecs;
let loop_counter = 0;
let looping = true;
let display_buff = 50;
let max_verts = 700;
let animationSpeed = 0.3; // Fraction of normal speed (0.3 = 30% speed)

function setup() {
    canvas = document.getElementById("canvas");
    
    // Get WebGL context
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    
    if (!gl) {
        console.warn("WebGL not supported - falling back to static background");
        document.body.classList.add("no-webgl");
        return;
    }
    
    // Set canvas size
    w = window.innerWidth;
    h = window.innerHeight;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    
    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Initialize line renderer
    lineRenderer = new GLColorLineRenderer(gl);
    
    // Initialize tessellation parameters
    const proto_v0 = [0, 0];
    const proto_v1 = [70, -19];
    const proto_v2 = [14, 40];
    diffs = [proto_v0, proto_v1, proto_v2];
    
    nudge();
    vertices = get_vertices();
    
    // Start animation
    window.requestAnimationFrame(draw);
}

function toggleAnimation() {
    looping = !looping;
    updateToggleButton();
}

function updateToggleButton() {
    const btn = document.getElementById("toggle-btn");
    if (btn) {
        btn.textContent = looping ? "❚❚" : "▶";
        btn.setAttribute("aria-label", looping ? "Pause animation" : "Play animation");
    }
}

function get_vertices() {
    const verts = [];
    
    // Use the two basis vectors for the tessellation grid
    const basisX = diffs[1]; // [70, -19] initially
    const basisY = diffs[2]; // [14, 40] initially
    
    // We need to find the range of grid indices (i, j) such that
    // the point centerX + j*basisX + i*basisY covers all four corners
    // 
    // For a point P = (px, py), we solve:
    //   px = centerX + j*basisX[0] + i*basisY[0]
    //   py = centerY + j*basisX[1] + i*basisY[1]
    //
    // This is a 2x2 linear system. We invert it to find i, j for each corner.
    
    const centerX = w / 2;
    const centerY = h / 2;
    
    // Matrix: [basisX[0], basisY[0]]
    //         [basisX[1], basisY[1]]
    // Determinant
    const det = basisX[0] * basisY[1] - basisX[1] * basisY[0];
    
    if (Math.abs(det) < 0.0001) {
        // Degenerate case - basis vectors are nearly parallel
        // Fall back to simple grid
        return getFallbackVertices();
    }
    
    // Inverse matrix (scaled by det):
    // [ basisY[1], -basisY[0]]
    // [-basisX[1],  basisX[0]]
    
    // Check all four corners plus some buffer
    const corners = [
        [-display_buff, -display_buff],
        [w + display_buff, -display_buff],
        [-display_buff, h + display_buff],
        [w + display_buff, h + display_buff]
    ];
    
    let minI = Infinity, maxI = -Infinity;
    let minJ = Infinity, maxJ = -Infinity;
    
    for (const corner of corners) {
        // Offset from center
        const dx = corner[0] - centerX;
        const dy = corner[1] - centerY;
        
        // Solve for j and i using inverse matrix
        const j = (basisY[1] * dx - basisY[0] * dy) / det;
        const i = (-basisX[1] * dx + basisX[0] * dy) / det;
        
        minI = Math.min(minI, i);
        maxI = Math.max(maxI, i);
        minJ = Math.min(minJ, j);
        maxJ = Math.max(maxJ, j);
    }
    
    // Add a small buffer and convert to integers
    const iStart = Math.floor(minI) - 1;
    const iEnd = Math.ceil(maxI) + 1;
    const jStart = Math.floor(minJ) - 1;
    const jEnd = Math.ceil(maxJ) + 1;
    
    for (let i = iStart; i <= iEnd; i++) {
        for (let j = jStart; j <= jEnd; j++) {
            const px = centerX + j * basisX[0] + i * basisY[0];
            const py = centerY + j * basisX[1] + i * basisY[1];
            
            // Only include if within display bounds (with buffer)
            if (px > -display_buff && px < w + display_buff && 
                py > -display_buff && py < h + display_buff) {
                verts.push([px, py]);
            }
        }
    }
    
    return verts;
}

function getFallbackVertices() {
    // Fallback for degenerate cases
    const verts = [];
    const spacing = 50;
    for (let y = -display_buff; y < h + display_buff; y += spacing) {
        for (let x = -display_buff; x < w + display_buff; x += spacing) {
            verts.push([x, y]);
        }
    }
    return verts;
}

function nudge(max_jump = 0.07) {
    nudge_vecs = [[0, 0], [0, 0], [0, 0]];
    for (let i = 1; i < nudge_vecs.length; i++) {
        nudge_vecs[i] = [
            max_jump * 2 * (Math.random() - 0.5),
            max_jump * 2 * (Math.random() - 0.5)
        ];
    }
}

function rose(k, theta, max_radius) {
    const r = Math.cos(k * theta) * max_radius;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return [r * cosT, r * sinT];
}

function spacial_ind0(v, spacial_period = 60) {
    return Math.floor((3 * v[0] + v[1]) / spacial_period);
}

function spacial_ind1(v, spacial_period = 45) {
    return Math.floor(-(2 * v[0] + 3 * v[1]) / spacial_period);
}

function spacial_ind2(v, spacial_period = 75) {
    return Math.floor((3 * v[1]) / spacial_period);
}

function gen_skew(v, period, max_rad, spacial_ind, dir = 1, k = 3) {
    return rose(k, (2 * dir * Math.PI / period) * (loop_counter + spacial_ind), max_rad);
}

function draw_curve_gl(p0, p1, skew, color = [1, 1, 1, 1]) {
    // Calculate midpoint
    const midX = (p0[0] + p1[0]) / 2;
    const midY = (p0[1] + p1[1]) / 2;
    
    // Calculate intermediate points
    const inter0 = [midX - skew[0], midY - skew[1]];
    const inter1 = [midX + skew[0], midY + skew[1]];
    
    // Add polyline as connected segments
    lineRenderer.addLine(p0[0], p0[1], inter0[0], inter0[1], color);
    lineRenderer.addLine(inter0[0], inter0[1], inter1[0], inter1[1], color);
    lineRenderer.addLine(inter1[0], inter1[1], p1[0], p1[1], color);
}

function update_shape(momentum_period = 100) {
    if (vertices.length > max_verts) {
        for (let i = 0; i < nudge_vecs.length; i++) {
            nudge_vecs[i] = [-nudge_vecs[i][0], -nudge_vecs[i][1]];
        }
    }
    if (Math.floor(loop_counter) % momentum_period === 0 && 
        Math.floor(loop_counter) !== Math.floor(loop_counter - animationSpeed)) {
        nudge();
    }
    for (let i = 1; i < diffs.length; i++) {
        diffs[i] = [
            diffs[i][0] + nudge_vecs[i][0] * animationSpeed,
            diffs[i][1] + nudge_vecs[i][1] * animationSpeed
        ];
    }
}

function draw() {
    if (!looping || document.hidden) {
        window.requestAnimationFrame(draw);
        return;
    }
    
    // Clear with black background
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    loop_counter += animationSpeed;
    
    // Begin collecting line vertices
    lineRenderer.begin();
    
    // White color for lines
    const white = [1, 1, 1, 1];
    
    // Use CSS pixel dimensions for rendering, not device pixels
    const renderWidth = w;
    const renderHeight = h;
    
    for (let i = 0; i < vertices.length; i++) {
        const v0 = vertices[i];
        const v1 = [v0[0] + diffs[1][0], v0[1] + diffs[1][1]];
        const v2 = [v0[0] + diffs[2][0], v0[1] + diffs[2][1]];
        
        const skew0 = gen_skew(v0, 390, 13, spacial_ind0(v0), 1, 3.5);
        const skew1 = gen_skew(v0, 360, 9, spacial_ind1(v0), 1, 4);
        const skew2 = gen_skew(v0, 460, 15, spacial_ind2(v0), -1, 3);
        
        draw_curve_gl(v0, v1, skew0, white);
        draw_curve_gl(v1, v2, skew1, white);
        draw_curve_gl(v2, v0, skew2, white);
    }
    
    // Render all lines - use CSS pixel dimensions, not canvas buffer dimensions
    lineRenderer.render(renderWidth, renderHeight);
    
    update_shape();
    vertices = get_vertices();
    
    window.requestAnimationFrame(draw);
}

// Handle window resize
function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    vertices = get_vertices();
}

// Pause when tab loses focus
document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
        console.log("Tab hidden - animation paused at frame " + loop_counter);
    } else {
        console.log("Tab visible - animation resumed at frame " + loop_counter);
    }
});

window.addEventListener("load", setup);
window.addEventListener("resize", resize);
