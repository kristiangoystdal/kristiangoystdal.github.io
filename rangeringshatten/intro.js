// 3D-introen (30 s): gjennom skyene, slottet ved sjøen, toget, ugler, kosteridere som jager snoppen,
// en drage som spyr ild foran månen, en patronus-hjort over vannet, og til slutt storsalen med
// svevende lys, Rangeringshatten og tittelen.
//   RH.intro.preload()                       laster Three.js (bare på Mac-en, ikke på telefonene)
//   RH.intro.play(container, { onEnd })      → { skip(), dispose() }
window.RH = window.RH || {};
(function () {
  const BASE = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const LIBS = ['build/three.min.js', 'examples/js/shaders/CopyShader.js', 'examples/js/shaders/LuminosityHighPassShader.js',
    'examples/js/shaders/GammaCorrectionShader.js', 'examples/js/postprocessing/EffectComposer.js', 'examples/js/postprocessing/RenderPass.js',
    'examples/js/postprocessing/ShaderPass.js', 'examples/js/postprocessing/UnrealBloomPass.js'];
  let loading = null;
  function preload() {
    if (loading) return loading;
    loading = LIBS.reduce((p, src) => p.then(() => new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + src; s.onload = res; s.onerror = () => rej(new Error('Fikk ikke lastet 3D-biblioteket.'));
      document.head.appendChild(s);
    })), Promise.resolve());
    loading.catch(() => { loading = null; });
    return loading;
  }

  const DURATION = 30;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function play(container, opts) {
    opts = opts || {};
    const THREE = window.THREE;
    let disposed = false, ended = false, raf = 0;
    const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();
    const rand = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();

    /* ---------- Oppsett ---------- */
    const W = () => container.clientWidth, H = () => container.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(W(), H());
    container.appendChild(renderer.domElement);
    const flash = document.createElement('div'); flash.className = 'intro-flash'; flash.style.opacity = '0'; container.appendChild(flash);
    const fade = document.createElement('div'); fade.className = 'intro-flash'; fade.style.background = '#000'; container.appendChild(fade);
    const hint = document.createElement('p'); hint.className = 'intro-hint'; hint.textContent = 'Klikk for å hoppe over'; container.appendChild(hint);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(C('#0d1838'), 0.0016);
    const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.5, 4000);
    const hall = new THREE.Scene();
    hall.fog = new THREE.FogExp2(C('#0a0716'), 0.02);
    const hallCam = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 400);

    const composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W(), H()), 0.9, 0.55, 0.72);
    composer.addPass(bloom);
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));

    // Myke teksturer, tegnet på et lerret
    function canvasTex(size, draw) {
      const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
      const t = new THREE.CanvasTexture(c); return t;
    }
    const softTex = canvasTex(64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
    const cloudTex = canvasTex(256, (g, s) => {
      for (let i = 0; i < 22; i++) {
        const x = s * (0.2 + rand() * 0.6), y = s * (0.35 + rand() * 0.3), r = s * (0.1 + rand() * 0.18);
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, s, s);
      }
    });
    const glow = (color, size, opacity) => {
      const m = new THREE.SpriteMaterial({ map: softTex, color: C(color), transparent: true, opacity: opacity == null ? 1 : opacity, blending: THREE.AdditiveBlending, depthWrite: false });
      const sp = new THREE.Sprite(m); sp.scale.setScalar(size); return sp;
    };
    const std = (hex, o) => new THREE.MeshStandardMaterial(Object.assign({ color: C(hex), roughness: 0.9, metalness: 0, flatShading: true }, o || {}));
    const basic = (hex, o) => new THREE.MeshBasicMaterial(Object.assign({ color: C(hex) }, o || {}));

    /* ---------- Himmel, måne og stjerner ---------- */
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: C('#030612') }, mid: { value: C('#0f1b44') }, low: { value: C('#2a2350') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.7, h)) : mix(low, mid, smoothstep(-0.1, 0.08, h)); gl_FragColor = vec4(c, 1.0); }'
    }));
    scene.add(sky);
    {
      const n = 2600, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = rand() * Math.PI * 2, ph = Math.acos(rand() * 0.92), r = 1500;
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph) + 40; pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: C('#dfe6ff'), fog: false, transparent: true, opacity: 0.9 })));
    }
    const MOON = new THREE.Vector3(-260, 300, -900);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(42, 32, 16), basic('#fff1cf', { fog: false }));
    moon.position.copy(MOON); scene.add(moon);
    const moonHalo = glow('#a8b8ff', 520, 0.45); moonHalo.material.fog = false; moonHalo.position.copy(MOON); scene.add(moonHalo);

    scene.add(new THREE.HemisphereLight(C('#3a4e99'), C('#0a0d18'), 0.75));
    const moonLight = new THREE.DirectionalLight(C('#b9c8ff'), 0.9); moonLight.position.copy(MOON); scene.add(moonLight);

    /* ---------- Landskap: åser, fjell og sjøen ---------- */
    const CASTLE = new THREE.Vector3(0, 0, -140);
    {
      const g = new THREE.PlaneGeometry(4000, 4000, 140, 140); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        let h = Math.sin(x * 0.006) * 18 + Math.cos(z * 0.008 + 1) * 14 + Math.sin((x + z) * 0.02) * 4;
        const lake = Math.hypot((x - 0) / 1.6, z - 140);
        h -= 40 * (1 - ss(150, 330, lake));
        const far = Math.hypot(x, z + 200);
        h += Math.max(0, far - 700) * 0.35 * (0.6 + 0.4 * Math.sin(x * 0.01));
        p.setY(i, h + 4);
      }
      g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, std('#13261b', { roughness: 1 })));
      const water = new THREE.Mesh(new THREE.CircleGeometry(520, 64), std('#0a1a3a', { roughness: 0.55, metalness: 0.35, flatShading: false }));
      water.rotation.x = -Math.PI / 2; water.scale.set(1.6, 1, 1); water.position.set(0, 0, 140); scene.add(water);
      // Månen speiler seg i vannet
      for (let i = 0; i < 14; i++) {
        const s = glow('#fff1cf', 10 + rand() * 16, 0.035 + rand() * 0.04);
        s.position.set(-90 + (rand() - 0.5) * 30, 0.4, 330 - i * 22); s.scale.y = 3; scene.add(s);
      }
      // Fjell i bakgrunnen
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI * 0.95 + (i / 25) * Math.PI * 0.9, r = 900 + rand() * 300, h = 160 + rand() * 260;
        const m = new THREE.Mesh(new THREE.ConeGeometry(120 + rand() * 120, h, 5), std('#0b1426'));
        m.position.set(Math.cos(a) * r, h / 2 - 10, Math.sin(a) * r - 200); m.rotation.y = rand() * 3; scene.add(m);
      }
      // Trær langs breddene
      const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(4, 16, 6), std('#0c2016'), 420);
      const M = new THREE.Matrix4();
      for (let i = 0; i < 420; i++) {
        let x, z;
        do { x = (rand() - 0.5) * 900; z = -400 + rand() * 800; } while (Math.hypot(x / 1.6, z - 140) < 340 || Math.hypot(x, z - CASTLE.z) < 110);
        const s = 0.7 + rand() * 1.1;
        M.compose(new THREE.Vector3(x, 8 * s + Math.sin(x * 0.006) * 18 + Math.cos(z * 0.008 + 1) * 14, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
        trees.setMatrixAt(i, M);
      }
      scene.add(trees);
    }

    /* ---------- Slottet ---------- */
    const stone = std('#4a5063'), roof = std('#1c2234'), rock = std('#232a30', { roughness: 1 });
    const windowMat = basic('#ffc56b');
    const castle = new THREE.Group(); castle.position.copy(CASTLE); scene.add(castle);
    {
      const cliff = new THREE.Mesh(new THREE.CylinderGeometry(80, 120, 60, 11, 3), rock);
      const cp = cliff.geometry.attributes.position;
      for (let i = 0; i < cp.count; i++) { cp.setX(i, cp.getX(i) * (0.9 + rand() * 0.2)); cp.setZ(i, cp.getZ(i) * (0.9 + rand() * 0.2)); }
      cliff.geometry.computeVertexNormals(); cliff.position.y = 20; castle.add(cliff);
      const top = 50;
      const wins = [];
      const tower = (x, z, r, h, roofH) => {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 12), stone); t.position.set(x, top + h / 2, z); castle.add(t);
        const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, roofH || h * 0.5, 12), roof); c.position.set(x, top + h + (roofH || h * 0.5) / 2, z); castle.add(c);
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.15, 1.2, 12), stone); ring.position.set(x, top + h, z); castle.add(ring);
        for (let k = 0; k < Math.floor(h / 5); k++) {
          if (rand() < 0.45) continue;
          const a = rand() * Math.PI * 2, y = top + 4 + rand() * (h - 7);
          wins.push([x + Math.cos(a) * (r + 0.15), y, z + Math.sin(a) * (r + 0.15), a]);
        }
      };
      const hallBox = (x, z, w, h, d, ry) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone); b.position.set(x, top + h / 2, z); b.rotation.y = ry || 0; castle.add(b);
        const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.01, d * 0.62, w, 4, 1), roof);
        rf.rotation.z = Math.PI / 2; rf.rotation.x = Math.PI / 4; rf.scale.set(1, 1, 0.8);
        const rg = new THREE.Group(); rg.add(rf); rg.position.set(x, top + h + d * 0.22, z); rg.rotation.y = ry || 0; castle.add(rg);
        for (let k = 0; k < w / 4; k++) {
          const lx = -w / 2 + 2 + k * 4;
          [-1, 1].forEach((side) => {
            if (rand() < 0.3) return;
            const v = new THREE.Vector3(lx, top + h * 0.55, side * (d / 2 + 0.15)).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry || 0);
            wins.push([x + v.x, v.y, z + v.z, (ry || 0) + (side > 0 ? Math.PI / 2 : -Math.PI / 2), 1.6]);
          });
        }
      };
      hallBox(0, 10, 56, 20, 18);                // storsalen (vinduet introen flyr inn gjennom)
      hallBox(-34, -14, 30, 16, 14, 0.5);
      hallBox(36, -10, 34, 15, 13, -0.4);
      hallBox(8, -36, 40, 14, 12, 0.1);
      tower(0, -18, 7, 72, 34);                  // astronomitårnet
      tower(-30, 4, 6, 50); tower(30, 2, 5.5, 46); tower(-52, -18, 4.5, 38); tower(56, -22, 4.6, 40);
      tower(-18, 28, 3.8, 32); tower(20, 28, 3.8, 34); tower(-12, -44, 4, 36); tower(32, -42, 3.5, 30); tower(-44, 22, 3.4, 28); tower(48, 20, 3.4, 30);
      // Vinduer
      const wGeo = new THREE.PlaneGeometry(1.1, 2.1);
      const inst = new THREE.InstancedMesh(wGeo, windowMat, wins.length);
      const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      wins.forEach(([x, y, z, a, s], i) => {
        q.setFromAxisAngle(up, -a + Math.PI / 2);
        M.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s || 1, s || 1, 1)); inst.setMatrixAt(i, M);
      });
      castle.add(inst);
      // Det store vinduet på storsalen, mot sjøen
      const big = new THREE.Mesh(new THREE.PlaneGeometry(10, 12), basic('#ffd27a')); big.position.set(0, top + 10, 19.3); castle.add(big);
      const bigGlow = glow('#ffb04a', 60, 0.5); bigGlow.position.set(0, top + 10, 22); castle.add(bigGlow);
      const warm = new THREE.PointLight(C('#ffae5a'), 2.2, 220, 1.6); warm.position.set(0, top + 30, 30); castle.add(warm);
    }
    // Viadukten og Galtvort-toget
    const train = new THREE.Group(); scene.add(train);
    const VIADUCT_Z = 40, VIADUCT_Y = 34;
    {
      for (let i = 0; i < 26; i++) {
        const x = -480 + i * 26;
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(5, 60, 6), stone); pillar.position.set(x, VIADUCT_Y - 31, VIADUCT_Z); scene.add(pillar);
        const arch = new THREE.Mesh(new THREE.TorusGeometry(10.5, 2, 6, 12, Math.PI), stone); arch.position.set(x + 13, VIADUCT_Y - 12, VIADUCT_Z); scene.add(arch);
      }
      const deck = new THREE.Mesh(new THREE.BoxGeometry(700, 3, 8), stone); deck.position.set(-150, VIADUCT_Y - 1.5, VIADUCT_Z); scene.add(deck);
      const red = std('#8a1418', { roughness: 0.6, metalness: 0.3 }), black = std('#15151a', { metalness: 0.5, roughness: 0.5 });
      const engine = new THREE.Group();
      const boiler = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 11, 14), red); boiler.rotation.z = Math.PI / 2; boiler.position.set(2, 3.4, 0); engine.add(boiler);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(4.5, 5.5, 5), red); cab.position.set(-5.5, 4, 0); engine.add(cab);
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 3, 10), black); chimney.position.set(6, 6.5, 0); engine.add(chimney);
      const lamp = glow('#fff0b0', 5, 0.6); lamp.position.set(8, 3.4, 0); engine.add(lamp);
      for (let k = 0; k < 4; k++) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 5.4, 12), black); wh.rotation.x = Math.PI / 2; wh.position.set(-5 + k * 3.6, 1.3, 0); engine.add(wh); }
      train.add(engine);
      const winStrip = basic('#ffd27a');
      for (let c = 1; c <= 5; c++) {
        const car = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(13, 5, 5), red); body.position.y = 3.6; car.add(body);
        const rf = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.6, 5.4), black); rf.position.y = 6.3; car.add(rf);
        [-2.55, 2.55].forEach((z) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.3), winStrip); s.position.set(0, 4.3, z); if (z < 0) s.rotation.y = Math.PI; car.add(s); });
        car.position.x = -c * 14.5 - 2; train.add(car);
      }
      train.position.set(-600, VIADUCT_Y, VIADUCT_Z);
    }
    const steam = [];
    for (let i = 0; i < 36; i++) { const s = glow('#c9d2e8', 8, 0); s.material.blending = THREE.NormalBlending; scene.add(s); steam.push({ s, born: -9 }); }

    // Skyer
    const clouds = [];
    for (let i = 0; i < 46; i++) {
      const near = i < 18;
      const m = new THREE.SpriteMaterial({ map: cloudTex, color: C(near ? '#5d6a99' : '#8b97c4'), transparent: true, opacity: near ? 0.32 : 0.5, depthWrite: false });
      const s = new THREE.Sprite(m); const sc = 120 + rand() * 180; s.scale.set(sc * 1.6, sc, 1);
      s.position.set((rand() - 0.5) * (near ? 300 : 1400), near ? 200 + rand() * 90 : 150 + rand() * 120, near ? 140 + rand() * 300 : -300 + rand() * 900);
      scene.add(s); clouds.push({ s, v: 2 + rand() * 4 });
    }

    /* ---------- Skapninger og ridere ---------- */
    function wingGeo(span, chord, curl) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.quadraticCurveTo(span * 0.5, chord * 0.6, span, chord * 0.1 * curl);
      shape.lineTo(span * 0.8, -chord * 0.3); shape.lineTo(span * 0.55, -chord * 0.15); shape.lineTo(span * 0.35, -chord * 0.45); shape.lineTo(0, -chord * 0.35);
      const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); return g;
    }
    function owl(color) {
      const g = new THREE.Group(), m = std(color, { side: THREE.DoubleSide });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), m); body.scale.set(0.8, 0.8, 1.3); g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), m); head.position.set(0, 0.45, 1.0); g.add(head);
      [-0.25, 0.25].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), basic('#ffcc33')); e.position.set(x, 0.55, 1.55); g.add(e); });
      const L = new THREE.Group(), R = new THREE.Group();
      const lw = new THREE.Mesh(wingGeo(3.2, 1.8, 1), m); L.add(lw); const rw = lw.clone(); rw.scale.x = -1; R.add(rw);
      L.position.set(0.5, 0.2, 0.2); R.position.set(-0.5, 0.2, 0.2); g.add(L, R);
      g.userData = { L, R, speed: 9 + rand() * 3 };
      return g;
    }
    function flap(o, t, amp) { const a = Math.sin(t * o.userData.speed) * (amp || 0.75); o.userData.L.rotation.z = a; o.userData.R.rotation.z = -a; }

    const owls = [
      { o: owl('#f2f2f6'), curve: [[-260, 170, 360], [-60, 178, 300], [60, 186, 250], [300, 200, 160]], t0: 1.5, t1: 9 },
      { o: owl('#8a7a66'), curve: [[-300, 150, 320], [-80, 160, 280], [120, 175, 230], [320, 190, 120]], t0: 2.2, t1: 10 },
      { o: owl('#b9a58a'), curve: [[-320, 70, 260], [-160, 60, 210], [-30, 70, 160], [160, 95, 60]], t0: 6, t1: 13 }
    ];
    owls.forEach((w) => { w.o.scale.setScalar(3); w.path = new THREE.CatmullRomCurve3(w.curve.map((p) => new THREE.Vector3(...p))); scene.add(w.o); });

    function rider(scarf) {
      const g = new THREE.Group();
      const wood = std('#6b4a2a'), straw = std('#c9a25a'), robe = std('#141420'), skin = std('#e2b48e');
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 6), wood); stick.rotation.x = Math.PI / 2; g.add(stick);
      const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 8, 1, true), straw); bristle.rotation.x = -Math.PI / 2; bristle.position.z = -2.6; g.add(bristle);
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.7, 8), robe); body.position.set(0, 0.85, -0.3); body.rotation.x = 0.55; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin); head.position.set(0, 1.75, 0.25); g.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#2a1a10')); hair.position.copy(head.position); hair.position.y += 0.03; g.add(hair);
      const tex = canvasTex(64, (c, s) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? scarf[0] : scarf[1]; c.fillRect(0, i * s / 8, s, s / 8); } });
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2.2, 1, 8), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 1 }));
      sc.geometry.translate(0, -1.1, 0); sc.rotation.x = -1.2; sc.position.set(0.1, 1.45, 0.05); g.add(sc);
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.8, 1, 6), std('#1a1a2c', { side: THREE.DoubleSide }));
      cape.geometry.translate(0, -0.9, 0); cape.rotation.x = -1.1; cape.position.set(0, 1.5, -0.2); g.add(cape);
      g.userData = { sc, cape };
      g.scale.setScalar(2.4);
      return g;
    }
    const RIDE = new THREE.CatmullRomCurve3([[-230, 70, 160], [-110, 64, 120], [-20, 80, 70], [70, 96, 40], [120, 104, -60], [60, 110, -170], [-60, 120, -190], [-150, 100, -100], [-170, 90, 20]].map((p) => new THREE.Vector3(...p)));
    const riders = [rider(['#a3262a', '#e8b23a']), rider(['#2c7a4a', '#c4c8cc']), rider(['#a3262a', '#e8b23a'])];
    riders.forEach((r) => scene.add(r));
    const snitch = new THREE.Group();
    {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: C('#ffcf3a'), metalness: 1, roughness: 0.25, emissive: C('#7a5200'), emissiveIntensity: 0.6 }));
      snitch.add(ball);
      const wm = new THREE.MeshBasicMaterial({ color: C('#f4f4ff'), side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const L = new THREE.Group(), R = new THREE.Group();
      const w = new THREE.Mesh(wingGeo(2.2, 1, 1), wm); L.add(w); const w2 = w.clone(); w2.scale.x = -1; R.add(w2);
      L.position.x = 0.5; R.position.x = -0.5; snitch.add(L, R);
      snitch.userData = { L, R, speed: 45 };
      const g = glow('#ffd54a', 10, 0.8); snitch.add(g);
      scene.add(snitch);
    }
    const dust = [];
    for (let i = 0; i < 160; i++) { const s = glow('#ffd98a', 1.4, 0); scene.add(s); dust.push({ s, born: -9, v: new THREE.Vector3() }); }
    let dustI = 0;
    const emitDust = (p, t, color, spread) => {
      const d = dust[dustI++ % dust.length];
      d.s.position.copy(p); d.born = t; d.v.set((rand() - 0.5) * spread, (rand() - 0.5) * spread, (rand() - 0.5) * spread);
      d.s.material.color = C(color || '#ffd98a');
    };

    // Dragen
    const dragon = new THREE.Group();
    const fire = [];
    {
      const scale = std('#3a2418', { roughness: 0.7 }), belly = std('#7a4a26'), membrane = std('#4a2a1a', { side: THREE.DoubleSide, roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), scale); body.scale.set(1.2, 1, 3); dragon.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 3, 8), scale); neck.rotation.x = Math.PI / 2 - 0.4; neck.position.set(0, 0.8, 3.6); dragon.add(neck);
      const head = new THREE.Group(); head.position.set(0, 1.5, 5.4); dragon.add(head);
      const skull = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 6), scale); skull.rotation.x = Math.PI / 2; skull.position.z = 0.7; head.add(skull);
      [-0.35, 0.35].forEach((x) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.1, 5), belly); horn.position.set(x, 0.45, -0.2); horn.rotation.x = -0.9; head.add(horn);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), basic('#ffb020')); eye.position.set(x * 0.9, 0.25, 0.3); head.add(eye);
      });
      let prev = new THREE.Vector3(0, 0, -2.5);
      for (let k = 0; k < 7; k++) {
        const r = 0.7 - k * 0.09, seg = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), scale);
        prev = prev.clone().add(new THREE.Vector3(0, -0.05 * k, -1.0)); seg.position.copy(prev); seg.scale.z = 1.6; dragon.add(seg);
      }
      for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 4), belly); sp.position.set(0, 0.95 - k * 0.05, 2.2 - k * 1.0); dragon.add(sp); }
      const L = new THREE.Group(), R = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(4, 2.2); shape.lineTo(8.5, 1.2); shape.quadraticCurveTo(7.4, -0.6, 8, -2.6); shape.quadraticCurveTo(6.4, -1.4, 5.6, -3.4);
      shape.quadraticCurveTo(4.4, -1.8, 3, -3.6); shape.quadraticCurveTo(2, -1.6, 0, -2.2);
      const wg = new THREE.ShapeGeometry(shape); wg.rotateX(-Math.PI / 2);
      const lw = new THREE.Mesh(wg, membrane); L.add(lw); const rw = lw.clone(); rw.scale.x = -1; R.add(rw);
      L.position.set(0.7, 0.6, 1); R.position.set(-0.7, 0.6, 1); dragon.add(L, R);
      dragon.userData = { L, R, head, speed: 3.2 };
      dragon.scale.setScalar(9);
      scene.add(dragon);
      for (let i = 0; i < 90; i++) { const s = glow('#ffb347', 8, 0); scene.add(s); fire.push({ s, born: -9, v: new THREE.Vector3() }); }
    }
    const DRAGON = new THREE.CatmullRomCurve3([[-520, 230, -420], [-300, 190, -260], [-120, 175, -160], [60, 165, -90], [240, 150, -10], [460, 140, 60]].map((p) => new THREE.Vector3(...p)));
    let fireI = 0;

    // Patronus-hjorten
    const stag = new THREE.Group();
    {
      const m = new THREE.MeshBasicMaterial({ color: C('#bfe4ff'), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), m); body.scale.set(0.9, 0.85, 1.9); stag.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.8, 8), m); neck.position.set(0, 1.0, 1.6); neck.rotation.x = 0.6; stag.add(neck);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.3, 8), m); head.position.set(0, 1.75, 2.3); head.rotation.x = Math.PI / 2 + 0.3; stag.add(head);
      const antler = (side) => {
        const g = new THREE.Group(); g.position.set(side * 0.25, 2.05, 1.95);
        const seg = (len, rx, rz, parent) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, len, 5), m); s.geometry.translate(0, len / 2, 0); s.rotation.set(rx, 0, rz); parent.add(s); return s; };
        const main = seg(1.6, -0.5, side * 0.6, g);
        const tip = new THREE.Group(); tip.position.y = 1.6; main.add(tip);
        seg(0.9, -0.3, side * -0.3, tip); seg(0.8, 0.4, side * 0.5, tip);
        const mid = new THREE.Group(); mid.position.y = 0.8; main.add(mid); seg(0.7, 0.6, side * -0.2, mid);
        stag.add(g);
      };
      antler(1); antler(-1);
      const legs = [];
      [[0.45, 1.2], [-0.45, 1.2], [0.45, -1.2], [-0.45, -1.2]].forEach(([x, z], i) => {
        const hip = new THREE.Group(); hip.position.set(x, -0.4, z); stag.add(hip);
        const up = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 6), m); up.position.y = -0.65; hip.add(up);
        const knee = new THREE.Group(); knee.position.y = -1.3; hip.add(knee);
        const low = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 1.3, 6), m); low.position.y = -0.65; knee.add(low);
        legs.push({ hip, knee, ph: [0, 0.5, 2.2, 2.7][i] });
      });
      const aura = glow('#9fd2ff', 14, 0.6); stag.add(aura);
      stag.userData = { legs };
      stag.scale.setScalar(5);
      scene.add(stag);
    }

    /* ---------- Storsalen med hatten ---------- */
    const candles = [];
    let hat, mouth, title, titleMat, subMat, hatSpark = [];
    {
      hall.add(new THREE.AmbientLight(C('#2a2440'), 0.6));
      const warm = new THREE.PointLight(C('#ffb35a'), 2.5, 80, 1.5); warm.position.set(0, 16, 4); hall.add(warm);
      const spot = new THREE.SpotLight(C('#fff0cc'), 3, 60, 0.35, 0.6, 1.2); spot.position.set(0, 24, 8); spot.target.position.set(0, 2, 0); hall.add(spot, spot.target);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), std('#2a2230', { roughness: 0.35, metalness: 0.2, flatShading: false }));
      floor.rotation.x = -Math.PI / 2; hall.add(floor);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), std('#1d1828')); wall.position.set(0, 30, -26); hall.add(wall);
      for (let i = -3; i <= 3; i++) {
        const s = new THREE.Shape(); s.moveTo(-2.4, 0); s.lineTo(2.4, 0); s.lineTo(2.4, 12); s.absarc(0, 12, 2.4, 0, Math.PI, false); s.lineTo(-2.4, 0);
        const w = new THREE.Mesh(new THREE.ShapeGeometry(s), basic('#203a7a')); w.position.set(i * 9, 6, -25.9); hall.add(w);
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(3, 10), std(['#7a1a1e', '#1a4a2e', '#1e2f6a', '#8a6a1a'][(i + 3) % 4])); banner.position.set(i * 9 + 4.5, 16, -25.8); hall.add(banner);
      }
      // Den forheksede himmelen
      const n = 900, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = (rand() - 0.5) * 120; pos[i * 3 + 1] = 34 + rand() * 6; pos[i * 3 + 2] = -30 + rand() * 60; }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      hall.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, color: C('#cfd8ff') })));
      // Svevende lys
      const wax = std('#efe6cf', { flatShading: false });
      for (let i = 0; i < 70; i++) {
        const g = new THREE.Group();
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 8), wax); g.add(c);
        const f = glow('#ffbf55', 1.6, 0.95); f.position.y = 1.05; g.add(f);
        g.position.set((rand() - 0.5) * 50, 7 + rand() * 14, -22 + rand() * 34);
        hall.add(g); candles.push({ g, y: g.position.y, ph: rand() * 6 });
      }
      // Krakken
      const wood = std('#4a3220');
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.35, 16), wood); seat.position.y = 2.2; hall.add(seat);
      for (let k = 0; k < 3; k++) { const a = k * 2.09, l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 6), wood); l.position.set(Math.cos(a) * 1.1, 1.1, Math.sin(a) * 1.1); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); hall.add(l); }
      // Rangeringshatten
      const prof = [[0, 0], [3.4, 0], [3.5, 0.18], [3.0, 0.32], [1.7, 0.4], [1.55, 0.7], [1.4, 1.6], [1.18, 2.6], [0.88, 3.4], [0.6, 4.0], [0.34, 4.5], [0.12, 4.9], [0.02, 5.1]].map(([x, y]) => new THREE.Vector2(x, y));
      const hg = new THREE.LatheGeometry(prof, 28);
      const hp = hg.attributes.position;
      for (let i = 0; i < hp.count; i++) {
        let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
        const a = Math.atan2(z, x), wob = 1 + 0.07 * Math.sin(a * 5 + y * 2.6) + 0.04 * Math.sin(a * 11 - y * 4);
        if (y > 0.35) { x *= wob; z *= wob; }
        if (y > 2.2) { x += Math.pow(y - 2.2, 2) * 0.32; y -= Math.pow(y - 2.2, 2) * 0.12; }
        hp.setXYZ(i, x, y, z);
      }
      hg.computeVertexNormals();
      hat = new THREE.Group();
      hat.add(new THREE.Mesh(hg, std('#5e4129', { roughness: 1 })));
      const crease = std('#2a1a0e');
      [-0.55, 0.55].forEach((x) => { const e = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 6, 10, Math.PI), crease); e.position.set(x, 2.25, 1.32); e.rotation.z = Math.PI; hat.add(e); });
      mouth = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.09, 6, 14, Math.PI), crease); mouth.position.set(0, 1.25, 1.5); mouth.rotation.z = Math.PI; hat.add(mouth);
      hat.position.y = 2.4; hall.add(hat);
      for (let i = 0; i < 60; i++) { const s = glow('#ffd98a', 0.5, 0); hall.add(s); hatSpark.push({ s, ph: rand(), r: 2.5 + rand() * 3, sp: 0.3 + rand() * 0.5, h: rand() * 8 }); }
      // Tittelen
      const tc = document.createElement('canvas'); tc.width = 2048; tc.height = 360;
      const tg = tc.getContext('2d');
      tg.font = '220px "IM Fell English", Georgia, serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle';
      const grd = tg.createLinearGradient(0, 60, 0, 300); grd.addColorStop(0, '#fff3cf'); grd.addColorStop(0.5, '#ffd27a'); grd.addColorStop(1, '#d99a2b');
      tg.shadowColor = 'rgba(255,190,80,0.9)'; tg.shadowBlur = 30; tg.fillStyle = grd; tg.fillText('Rangeringshatten', 1024, 180);
      titleMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tc), transparent: true, opacity: 0, depthWrite: false });
      title = new THREE.Mesh(new THREE.PlaneGeometry(22, 22 * 360 / 2048), titleMat); title.position.set(0, 10.4, -1); hall.add(title);
      const sc2 = document.createElement('canvas'); sc2.width = 1024; sc2.height = 128;
      const sg2 = sc2.getContext('2d'); sg2.font = 'italic 64px "IM Fell English", Georgia, serif'; sg2.textAlign = 'center'; sg2.textBaseline = 'middle'; sg2.fillStyle = '#e8dcc0';
      sg2.fillText('Hvem havner øverst i kveld?', 512, 64);
      subMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc2), transparent: true, opacity: 0, depthWrite: false });
      const sub = new THREE.Mesh(new THREE.PlaneGeometry(11, 11 / 8), subMat); sub.position.set(0, 8.1, -1); hall.add(sub);
    }

    /* ---------- Kamerakjøringen ---------- */
    const keys = [
      [0, [-40, 270, 520], [0, 170, -120]],
      [3.5, [-20, 190, 330], [0, 80, -140]],
      [7, [-170, 52, 170], [-60, 36, 40]],
      [10, [-110, 70, 150], [0, 60, -80]],
      [13, [90, 92, 90], [-20, 80, -120]],
      [16, [150, 80, 190], [-80, 160, -250]],
      [19.5, [110, 40, 240], [40, 120, -60]],
      [21, [70, 14, 210], [-10, 6, 120]],
      [23.4, [10, 62, 110], [0, 60, -130]],
      [25.6, [0, 60, -112], [0, 60, -150]]
    ];
    const camPos = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[1])));
    const camTgt = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[2])));
    function camAt(t) {
      let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
      const u = Math.min(1, Math.max(0, (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0])));
      const k = (i + u) / (keys.length - 1);
      return [camPos.getPoint(k), camTgt.getPoint(k)];
    }

    /* ---------- Klokka ---------- */
    const music = RH.music, useAudio = music && !music.muted && music.unlock();
    const t0 = (useAudio ? music.now() : performance.now() / 1000) + 0.3;
    if (useAudio) music.intro(t0);
    const clock = () => (useAudio ? music.now() : performance.now() / 1000) - t0;

    function resize() {
      const w = W(), h = H(); renderer.setSize(w, h); composer.setSize(w, h);
      camera.aspect = hallCam.aspect = w / h;
      // Smale skjermer får litt videre utsnitt
      camera.fov = w / h < 1.4 ? 65 : 55; hallCam.fov = w / h < 1.4 ? 55 : 45;
      camera.updateProjectionMatrix(); hallCam.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    const tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const t = clock();
      if (t >= DURATION) { finish(); return; }
      const inHall = t >= 25.6;

      if (!inHall) {
        const [p, tg] = camAt(Math.max(0, t));
        const follow = ss(14.8, 16, t) * (1 - ss(20.2, 21.2, t));
        if (follow > 0 && dragon.visible) tg.lerp(dragon.position, follow * 0.85);
        camera.position.copy(p); camera.lookAt(tg);
        if (t > 16 && t < 19) camera.position.y += Math.sin(t * 40) * 0.25 * ss(17.6, 18, t) * (1 - ss(18.8, 19, t)); // risting når dragen brøler
        renderPass.scene = scene; renderPass.camera = camera;
        bloom.strength = 0.85;

        clouds.forEach((c) => { c.s.position.x += c.v * 0.016; });
        // Toget
        const tx = lerp(-560, 160, ss(3, 14, t));
        train.position.x = tx;
        if (t > 3 && t < 14) {
          const s = steam.find((x) => t - x.born > 2.5);
          if (s && rand() < 0.5) { s.born = t; s.s.position.set(tx + 6, VIADUCT_Y + 9, VIADUCT_Z); }
        }
        steam.forEach((s) => { const a = t - s.born; if (a < 0 || a > 2.5) { s.s.material.opacity = 0; return; } s.s.position.y += 0.12; s.s.position.x -= 0.25; s.s.scale.setScalar(6 + a * 10); s.s.material.opacity = 0.55 * (1 - a / 2.5); });
        // Uglene
        owls.forEach((w) => {
          const u = (t - w.t0) / (w.t1 - w.t0); w.o.visible = u > 0 && u < 1;
          if (!w.o.visible) return;
          w.path.getPointAt(u, tmp); w.o.position.copy(tmp); w.path.getPointAt(Math.min(1, u + 0.01), fwd); w.o.lookAt(fwd);
          flap(w.o, t);
        });
        // Kosteriderne og snoppen
        riders.forEach((r, i) => {
          const u = (t - 9.4 - i * 0.35) / 7; r.visible = u > 0 && u < 1;
          if (!r.visible) return;
          RIDE.getPointAt(u, tmp); tmp.y += Math.sin(t * 3 + i) * 2; tmp.x += Math.sin(t * 2 + i * 2) * 4 * (i - 1);
          r.position.copy(tmp); RIDE.getPointAt(Math.min(1, u + 0.01), fwd); r.lookAt(fwd);
          r.rotateZ(Math.sin(t * 2.5 + i) * 0.35);
          r.userData.sc.rotation.z = Math.sin(t * 14 + i) * 0.3; r.userData.cape.rotation.x = -1.2 + Math.sin(t * 12 + i) * 0.12;
          if (rand() < 0.6) emitDust(r.position.clone().add(new THREE.Vector3((rand() - 0.5) * 3, -1, 0)), t, i === 1 ? '#a8ffcc' : '#ffd98a', 1);
        });
        {
          const u = (t - 9) / 7; snitch.visible = u > 0 && u < 1;
          if (snitch.visible) {
            RIDE.getPointAt(Math.min(1, u + 0.03), tmp);
            tmp.add(new THREE.Vector3(Math.sin(t * 7) * 6, Math.cos(t * 9) * 4, Math.sin(t * 5) * 6));
            snitch.position.copy(tmp);
            const a = Math.sin(t * snitch.userData.speed) * 0.9; snitch.userData.L.rotation.z = a; snitch.userData.R.rotation.z = -a;
            emitDust(snitch.position, t, '#ffe27a', 0.6);
          }
        }
        // Dragen
        {
          const u = (t - 13.5) / 9.5; dragon.visible = u > 0 && u < 1;
          if (dragon.visible) {
            DRAGON.getPointAt(u, tmp); dragon.position.copy(tmp); DRAGON.getPointAt(Math.min(1, u + 0.01), fwd); dragon.lookAt(fwd);
            const a = Math.sin(t * dragon.userData.speed * 2) * 0.6; dragon.userData.L.rotation.z = a; dragon.userData.R.rotation.z = -a;
            dragon.position.y += Math.sin(t * dragon.userData.speed * 2 - 1) * 6;
            const breath = (t > 17.6 && t < 19.6) || (t > 19.8 && t < 21);
            dragon.userData.head.rotation.x = breath ? 0.35 : 0;
            if (breath) for (let k = 0; k < 3; k++) {
              const f = fire[fireI++ % fire.length];
              dragon.userData.head.getWorldPosition(f.s.position);
              const dir = new THREE.Vector3(0, -0.35, 1).applyQuaternion(dragon.quaternion).normalize();
              f.s.position.addScaledVector(dir, 18); f.v.copy(dir).multiplyScalar(5 + rand() * 3).add(new THREE.Vector3((rand() - 0.5) * 1.2, (rand() - 0.5) * 1.2, (rand() - 0.5) * 1.2));
              f.born = t;
            }
          }
          fire.forEach((f) => {
            const a = t - f.born; if (a < 0 || a > 1.1) { f.s.material.opacity = 0; return; }
            f.s.position.add(f.v); f.v.y += 0.04; f.s.scale.setScalar(10 + a * 60);
            f.s.material.opacity = 0.9 * (1 - a / 1.1);
            f.s.material.color = C(a < 0.25 ? '#fff0b0' : a < 0.6 ? '#ff9a2a' : '#c0301a');
          });
        }
        // Patronus-hjorten
        {
          const u = (t - 19.4) / 6; stag.visible = u > 0 && u < 1;
          if (stag.visible) {
            const x = lerp(-230, 200, u), run = t * 9;
            stag.position.set(x, 12 + Math.abs(Math.sin(run / 2)) * 3, 140 - u * 30);
            stag.rotation.y = Math.PI / 2 - 0.1;
            stag.userData.legs.forEach((l) => { l.hip.rotation.x = Math.sin(run + l.ph) * 0.7; l.knee.rotation.x = Math.max(0, Math.sin(run + l.ph + 1)) * 0.9; });
            stag.children.forEach((c) => { if (c.material && c.material.opacity !== undefined && c.type === 'Mesh') c.material.opacity = 0.5 + Math.sin(t * 6) * 0.08; });
            if (rand() < 0.9) emitDust(stag.position.clone().add(new THREE.Vector3(-6 + rand() * 4, -8 + rand() * 10, (rand() - 0.5) * 6)), t, '#cfe8ff', 0.4);
          }
        }
        dust.forEach((d) => { const a = t - d.born; if (a < 0 || a > 1.6) { d.s.material.opacity = 0; return; } d.s.position.add(d.v); d.s.position.y -= 0.03; d.s.material.opacity = 0.9 * (1 - a / 1.6); d.s.scale.setScalar(1.8 * (1 - a / 1.6) + 0.3); });
      } else {
        // Inne i storsalen
        renderPass.scene = hall; renderPass.camera = hallCam;
        const u = ss(25.6, 30, t);
        hallCam.position.set(Math.sin(u * 0.6) * 3, lerp(9, 6, u), lerp(28, 13.5, u));
        hallCam.lookAt(0, lerp(5.5, 6.4, u), 0);
        bloom.strength = 0.75;
        candles.forEach((c) => { c.g.position.y = c.y + Math.sin(t * 1.3 + c.ph) * 0.4; });
        hat.rotation.y = Math.sin(t * 0.8) * 0.25; hat.rotation.z = Math.sin(t * 1.6) * 0.04;
        const talk = t > 26.6 && t < 28.8; mouth.scale.y = talk ? 0.6 + Math.abs(Math.sin(t * 13)) * 1.6 : 1;
        hatSpark.forEach((s) => { const a = (t * s.sp + s.ph) % 1; s.s.position.set(Math.cos(s.ph * 20 + t) * s.r, 2.5 + a * 9, Math.sin(s.ph * 20 + t) * s.r); s.s.material.opacity = Math.sin(a * Math.PI) * ss(26, 27, t); s.s.scale.setScalar(0.6); });
        const ti = ss(27.2, 28.2, t);
        titleMat.opacity = ti; title.scale.setScalar(0.86 + 0.14 * ti);
        subMat.opacity = ss(28.2, 29, t);
      }
      flash.style.opacity = String(ss(24.6, 25.6, t) * (1 - ss(25.6, 26.6, t)));
      fade.style.opacity = String(1 - ss(0, 1.8, t));
      hint.style.opacity = String(ss(1.5, 2.5, t) * (1 - ss(6, 7, t)));
      composer.render();
    }

    function finish() {
      if (ended) return; ended = true;
      if (opts.onEnd) opts.onEnd();
    }
    function dispose() {
      if (disposed) return; disposed = true;
      cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
      [scene, hall].forEach((s) => s.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      }));
      composer.renderTarget1 && composer.renderTarget1.dispose(); composer.renderTarget2 && composer.renderTarget2.dispose();
      renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss();
      container.innerHTML = '';
    }
    frame();
    return {
      skip() { if (!ended && useAudio) music.stopIntro(); finish(); },
      dispose
    };
  }

  RH.intro = { preload, play, DURATION };
})();
