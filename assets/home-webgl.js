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

  let pointerX = 0;
  let pointerY = 0;
  let gyroX = 0;
  let gyroY = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  const setParallax = () => {
    currentX += (targetX - currentX) * .105;
    currentY += (targetY - currentY) * .105;
    document.documentElement.style.setProperty('--home-parallax-x', currentX.toFixed(3));
    document.documentElement.style.setProperty('--home-parallax-y', currentY.toFixed(3));
    document.documentElement.style.setProperty('--home-parallax-x-small', `${(currentX * 16).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-y-small', `${(currentY * 12).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-x-small-neg', `${(currentX * -16).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-y-small-neg', `${(currentY * -12).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-x-medium', `${(currentX * 31).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-y-medium', `${(currentY * 24).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-x-medium-neg', `${(currentX * -31).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-y-medium-neg', `${(currentY * -24).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-x-strong', `${(currentX * 48).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-y-strong', `${(currentY * 38).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-x-strong-neg', `${(currentX * -48).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-y-strong-neg', `${(currentY * -38).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-parallax-x-percent', `${(currentX * 11).toFixed(2)}%`);
    document.documentElement.style.setProperty('--home-parallax-y-percent', `${(currentY * 9).toFixed(2)}%`);
    document.documentElement.style.setProperty('--home-text-x-near', `${(currentX * 8).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-text-y-near', `${(currentY * 6).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-text-x-far', `${(currentX * -15).toFixed(1)}px`);
    document.documentElement.style.setProperty('--home-text-y-far', `${(currentY * -11).toFixed(1)}px`);
  };
  const updateTarget = () => {
    targetX = Math.max(-1, Math.min(1, pointerX * 1.18 + gyroX * .82));
    targetY = Math.max(-1, Math.min(1, pointerY * 1.18 + gyroY * .82));
  };

  const scenes = [
    '.ticker', '#sambutan', '#berita', '#agenda', '#galeri-film', '#tentang', '#gabung', '#kontak', 'footer'
  ].map((selector) => document.querySelector(selector)).filter(Boolean);
  scenes.forEach((scene) => scene.classList.add('home-scene'));
  const decorateSectionText = (root = document) => {
    root.querySelectorAll([
      '.ticker span', '.ticker p', '#sambutan h2', '#sambutan p',
      '#berita .section-kicker', '#berita h2', '#berita h3', '#berita p',
      '#agenda .section-kicker', '#agenda h2', '#agenda h3', '#agenda p',
      '#galeri-film .section-kicker', '#galeri-film h2', '#galeri-film p',
      '#tentang .section-kicker', '#tentang h2', '#tentang h3', '#tentang p',
      '#gabung .eyebrow', '#gabung h2', '#gabung p',
      '#kontak small', '#kontak p'
    ].join(',')).forEach((element, index) => {
      if (element.classList.contains('home-parallax-text')) return;
      element.classList.add('home-parallax-text', index % 3 === 0 ? 'home-parallax-text--far' : 'home-parallax-text--near');
    });
  };
  decorateSectionText();
  const main = document.querySelector('.home-webgl main');
  if (main) new MutationObserver(() => decorateSectionText()).observe(main, { childList: true, subtree: true });
  let sceneFrame = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const updateScenes = () => {
    sceneFrame = 0;
    const viewport = window.innerHeight || 1;
    scenes.forEach((scene) => {
      const bounds = scene.getBoundingClientRect();
      const travel = clamp((viewport - bounds.top) / (viewport + bounds.height));
      const enter = clamp(travel * 2.35);
      const exit = clamp((travel - .58) * 2.35);
      scene.style.setProperty('--scene-enter', enter.toFixed(3));
      scene.style.setProperty('--scene-exit', exit.toFixed(3));
      scene.style.setProperty('--scene-opacity', (.28 + enter * .72).toFixed(3));
      scene.style.setProperty('--scene-translate', `${((1 - enter) * 54 - exit * 24).toFixed(1)}px`);
      scene.style.setProperty('--scene-saturation', (.78 + enter * .22).toFixed(3));
      scene.style.setProperty('--scene-brightness', (.86 + enter * .14).toFixed(3));
      scene.style.setProperty('--scene-line-opacity', (enter * .72).toFixed(3));
      scene.classList.toggle('is-scene-active', enter > .64 && exit < .8);
    });
  };
  const requestSceneUpdate = () => {
    if (!sceneFrame) sceneFrame = requestAnimationFrame(updateScenes);
  };
  updateScenes();
  window.addEventListener('scroll', requestSceneUpdate, { passive: true });
  window.addEventListener('resize', requestSceneUpdate, { passive: true });
  window.addEventListener('pointermove', (event) => {
    pointerX = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
    updateTarget();
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; updateTarget(); }, { passive: true });

  const orientation = (event) => {
    if (!Number.isFinite(event.gamma) || !Number.isFinite(event.beta)) return;
    gyroX = Math.max(-1, Math.min(1, event.gamma / 28));
    gyroY = Math.max(-1, Math.min(1, event.beta / 40));
    hero.classList.add('gyro-active');
    updateTarget();
  };
  const enableGyro = () => window.addEventListener('deviceorientation', orientation, true);
  if ('DeviceOrientationEvent' in window) {
    if (typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
      enableGyro();
    }
  }

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
