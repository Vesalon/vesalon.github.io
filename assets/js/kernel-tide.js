// Kernel Tide background animation
// Zero-level contours of a sum of signed Gaussian kernels, whose centers are
// carried along by a slowly evolving divergence-free flow.

(() => {
  'use strict';

  const settings = {
    count: 220,  // number of kernel centers
    size: 0.17,  // kernel width
    speed: 0.22, // time scale of the flow
    swirl: 0.48, // strength of the curl flow relative to the drift
    bias: 0.0    // constant added to the field; shifts the contours
  };

  // Several slowly phase-shifting stream-function modes. Each mode contributes
  // a divergence-free velocity field: (dψ/dy, -dψ/dx).
  // Integer spatial frequencies make the field periodic across the canvas edges.
  const modes = [
    {kx: 1, ky: 1, a: .093, sx: .103, sy: -.067, px: 1.2, py: 3.1},
    {kx: 2, ky: 1, a: .062, sx: -.049, sy: .085, px: 3.6, py: 1.4},
    {kx: 1, ky: 3, a: .029, sx: .072, sy: .058, px: 2.5, py: 5.4},
    {kx: 3, ky: 2, a: .021, sx: -.082, sy: .069, px: 4.1, py: 2.2},
    {kx: 4, ky: 3, a: .011, sx: .064, sy: -.044, px: 0.6, py: 4.7}
  ];

  // (x, y, weight) per point; x spans [-aspect, aspect] and y spans [-1, 1].
  const points = new Float32Array(settings.count * 3);

  let canvas, gl, uResolution, uPoints;
  let aspect = 1;
  let visible = true;
  let looping = true;
  let needsRender = true;
  let time = 0;
  let last = null;

  const rnd = (a, b) => a + (b - a) * Math.random();
  const wrap = (v, r) => ((v + r) % (2 * r) + (2 * r)) % (2 * r) - r;
  const glFloat = v => v.toFixed(5);

  const vertexSource = `#version 300 es
    precision highp float;
    void main() {
      vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0,
                    (gl_VertexID == 2) ? 3.0 : -1.0);
      gl_Position = vec4(p, 0.0, 1.0);
    }
  `;

  const fragmentSource = `#version 300 es
    precision highp float;
    #define COUNT ${settings.count}
    const float SIZE = ${glFloat(settings.size)};
    const float BIAS = ${glFloat(settings.bias)};
    out vec4 frag;
    uniform vec2 uResolution;
    uniform vec3 uPoints[COUNT];

    void main() {
      vec2 p = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
      float aspect = uResolution.x / uResolution.y;
      p.x *= aspect;
      float ss = SIZE * SIZE;
      float f = BIAS;
      float coverage = 0.0;
      for (int i = 0; i < COUNT; ++i) {
        vec2 d = p - uPoints[i].xy;
        // Periodic nearest image; points crossing the edge stay visually continuous.
        d.x -= 2.0 * aspect * round(d.x / (2.0 * aspect));
        d.y -= 2.0 * round(d.y / 2.0);
        float r2 = dot(d, d);
        if (r2 < 18.0 * ss) {
          float k = exp(-.5 * r2 / ss);
          f += uPoints[i].z * k;
          coverage += k;
        }
      }
      float grad = max(fwidth(f), .00003);
      float line = 1.0 - smoothstep(.55, 1.55, abs(f) / grad);
      // Avoid artificial contours in almost-zero numerical tails.
      line *= smoothstep(.002, .016, coverage);
      frag = vec4(vec3(line), 1.0);
    }
  `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function createProgram() {
    const vs = createShader(gl.VERTEX_SHADER, vertexSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  function seed() {
    for (let i = 0; i < settings.count; ++i) {
      points[3 * i] = rnd(-aspect, aspect);
      points[3 * i + 1] = rnd(-1, 1);
      points[3 * i + 2] = (Math.random() < 0.5 ? -1 : 1) * rnd(0.62, 1.35);
    }
  }

  function velocity(x, y, t) {
    // Very slow large-scale translation superposed with the curl flow.
    let vx = .075 * Math.cos(.14 * t) + .038 * Math.sin(.055 * t);
    let vy = .052 * Math.sin(.11 * t) - .035 * Math.cos(.077 * t);
    for (const m of modes) {
      const kx = Math.PI * m.kx / aspect;
      const ky = Math.PI * m.ky;
      const a = kx * x + m.sx * t + m.px;
      const b = ky * y + m.sy * t + m.py;
      vx += settings.swirl * m.a * ky * Math.sin(a) * Math.cos(b);
      vy -= settings.swirl * m.a * kx * Math.cos(a) * Math.sin(b);
    }
    return [vx, vy];
  }

  function advance(dt) {
    for (let i = 0; i < settings.count; ++i) {
      const j = 3 * i;
      const x = points[j], y = points[j + 1];
      // Midpoint integration avoids sharp frame-to-frame changes in direction.
      const v1 = velocity(x, y, time);
      const v2 = velocity(x + .5 * dt * v1[0], y + .5 * dt * v1[1], time + .5 * dt);
      points[j] = wrap(x + dt * v2[0], aspect);
      points[j + 1] = wrap(y + dt * v2[1], 1);
    }
    time += dt;
  }

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const newAspect = width / height;
    // Stretch horizontally so the points keep covering the screen.
    for (let i = 0; i < settings.count; ++i) points[3 * i] *= newAspect / aspect;
    aspect = newAspect;

    // Modest internal resolution for an expensive fragment shader.
    const scale = Math.min(window.devicePixelRatio || 1, 1) * Math.min(1, 1400 / width, 850 / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);

    // The canvas is hidden by CSS on small screens; skip rendering there.
    visible = getComputedStyle(canvas).display !== 'none';
    needsRender = true;
  }

  function draw(ms) {
    const dt = last === null ? 0 : Math.min(.035, Math.max(0, (ms - last) / 1000));
    last = ms;
    if (visible && (looping || needsRender)) {
      if (looping) advance(dt * settings.speed);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform3fv(uPoints, points);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      needsRender = false;
    }
    window.requestAnimationFrame(draw);
  }

  function setup() {
    canvas = document.getElementById('canvas');
    if (!canvas) return;
    gl = canvas.getContext('webgl2', {alpha: false, antialias: false});
    const program = gl && createProgram();
    if (!program) {
      console.warn('WebGL2 not supported - falling back to static background');
      document.body.classList.add('no-webgl');
      return;
    }
    gl.useProgram(program);
    uResolution = gl.getUniformLocation(program, 'uResolution');
    uPoints = gl.getUniformLocation(program, 'uPoints');

    resize();
    seed();
    window.addEventListener('resize', resize);
    window.requestAnimationFrame(draw);
  }

  // Called by the pause button in the home layout.
  window.toggleAnimation = function () {
    looping = !looping;
    const btn = document.getElementById('toggle-btn');
    if (btn) {
      btn.textContent = looping ? '❚❚' : '▶';
      btn.setAttribute('aria-label', looping ? 'Pause animation' : 'Play animation');
    }
  };

  window.addEventListener('DOMContentLoaded', setup);
})();
