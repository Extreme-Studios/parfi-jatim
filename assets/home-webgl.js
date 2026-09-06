/* WebGL cinema atmosphere and mouse parallax for the public homepage only. */
(() => {
  const hero = document.querySelector('.home-webgl .hero');
  if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stage = document.createElement('div');
  stage.className = 'home-cinema-stage';
  stage.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  stage.append(canvas);
  hero.prepend(stage);
  ['home-cinema-glow', 'home-cinema-reel'].forEach((name) => {
    const layer = document.createElement('div');
    layer.className = name;
    layer.setAttribute('aria-hidden', 'true');
    hero.append(layer);
  });

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  const setParallax = () => {
    currentX += (targetX - currentX) * .075;
    currentY += (targetY - currentY) * .075;
    document.documentElement.style.setProperty('--home-parallax-x', currentX.toFixed(3));
    document.documentElement.style.setProperty('--home-parallax-y', currentY.toFixed(3));
  };
  window.addEventListener('pointermove', (event) => {
    targetX = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
    targetY = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
  }, { passive: true });
  window.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; }, { passive: true });

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) {
    hero.classList.add('webgl-unavailable');
    return;
  }

  const vertex = `attribute vec2 a_position; void main(){ gl_Position=vec4(a_position,0.0,1.0); }`;
  const fragment = `precision mediump float;
    uniform vec2 u_resolution; uniform float u_time; uniform vec2 u_mouse;
    float hash(vec2 p){return fract(sin(dot(p,vec2(41.7,289.3)))*43758.5453123);}
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution.xy; vec2 p=uv-0.5;
      p.x*=u_resolution.x/u_resolution.y;
      vec3 color=vec3(0.008,0.035,0.075);
      float beam=smoothstep(.76,.10,abs(p.y+.10*sin(p.x*1.6+u_mouse.x*.25))-abs(p.x*.22));
      color+=vec3(.18,.105,.025)*beam*.55;
      float arc=abs(length(p-vec2(.28+u_mouse.x*.035,-.12-u_mouse.y*.025))-.63);
      color+=vec3(.55,.34,.08)*smoothstep(.018,.001,arc)*.48;
      vec2 grid=floor((uv+u_mouse*.012)*vec2(58.0,34.0));
      float star=step(.991,hash(grid));
      float flicker=.58+.42*sin(u_time*2.2+hash(grid)*12.0);
      color+=vec3(.82,.58,.20)*star*flicker;
      float grain=hash(gl_FragCoord.xy+u_time*15.0)-.5;
      color+=grain*.055;
      gl_FragColor=vec4(color,1.0);
    }`;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'u_resolution');
  const time = gl.getUniformLocation(program, 'u_time');
  const mouse = gl.getUniformLocation(program, 'u_mouse');
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.floor(hero.clientWidth * ratio));
    canvas.height = Math.max(1, Math.floor(hero.clientHeight * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  new ResizeObserver(resize).observe(hero);
  resize();
  const started = performance.now();
  const render = (now) => {
    setParallax();
    if (!document.hidden) {
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - started) * .001);
      gl.uniform2f(mouse, currentX, currentY);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
})();
