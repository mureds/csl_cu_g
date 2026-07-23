// view3d.js — Three.js rendering of both crystal lattices + coincidence sites.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { generateLattice, findCoincidences, V } from './csl.js';

export class View3D {
  constructor(container) {
    this.el = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1017);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.el.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    this.camera.position.set(34, 14, 30);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // On-demand rendering: redraw whenever the camera changes (drag/zoom).
    // Continuous requestAnimationFrame is unreliable when the tab is treated
    // as hidden, which froze rotation. Damping needs a loop, so keep it off.
    this.controls.enableDamping = false;
    this.controls.addEventListener('change', () => this.renderFrame());

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(20, 40, 30); this.scene.add(dl);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.show = { cu: true, g: true, coin: true, plane: true, split: true };
  }

  renderFrame() {
    // NOTE: do NOT call controls.update() here — OrbitControls dispatches its
    // 'change' event from update(), which would re-enter renderFrame and recurse
    // infinitely. The 'change' listener already fires after the camera moved.
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const r = this.el.getBoundingClientRect();
    this.renderer.setSize(r.width, Math.max(1, r.height));
    this.camera.aspect = r.width / Math.max(1, r.height);
    this.camera.updateProjectionMatrix();
    this.renderFrame();
  }

  _instanced(pts, radius, color) {
    const geo = new THREE.SphereGeometry(radius, 14, 12);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 });
    const mesh = new THREE.InstancedMesh(geo, mat, pts.length);
    const m = new THREE.Matrix4();
    for (let i = 0; i < pts.length; i++) {
      m.makeTranslation(pts[i][0], pts[i][1], pts[i][2]);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  setState(s) {
    this.state = s;
    this.rebuild();
  }

  rebuild() {
    const s = this.state;
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.geometry?.dispose?.(); c.material?.dispose?.();
      this.group.remove(c);
    }
    const R = s.region;
    let ptsA = generateLattice({ a: s.aCu, motif: s.motifCu, rot: s.rotA, R });
    let ptsB = generateLattice({ a: s.aG,  motif: s.motifG,  rot: s.rotB, R });

    // Bicrystal mode: G-phase occupies the half-space above the interface
    // plane (n·p >= 0), Cu matrix occupies below (n·p <= 0). Coincidences are
    // then computed only between the two clipped sets, so they naturally
    // appear along the interface.
    if (this.show.split) {
      const n = V.norm(s.hkl);
      const side = (p) => p[0]*n[0] + p[1]*n[1] + p[2]*n[2];
      ptsA = ptsA.filter((p) => side(p) <= 1e-6);   // Cu matrix (below)
      ptsB = ptsB.filter((p) => side(p) >= -1e-6);  // G-phase (above)
    }
    const coin = findCoincidences(ptsA, ptsB, s.tol);

    this.counts = { cu: ptsA.length, g: ptsB.length, coin: coin.length };

    if (this.show.cu) this.group.add(this._instanced(ptsA, 0.42, 0xe88a3a));
    if (this.show.g)  this.group.add(this._instanced(ptsB, 0.34, 0x5aa0ff));
    if (this.show.coin && coin.length)
      this.group.add(this._instanced(coin.map(c => c.b), 0.62, 0x50e68c));

    // interface plane (through origin, normal = hkl)
    if (this.show.plane) {
      const n = new THREE.Vector3(...V.norm(s.hkl));
      const geo = new THREE.PlaneGeometry(R * 2, R * 2);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.07, side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(geo, mat);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), n);
      plane.quaternion.copy(q);
      this.group.add(plane);

      // plane outline
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(edges,
        new THREE.LineBasicMaterial({ color: 0x8fb6ff, transparent: true, opacity: 0.4 }));
      line.quaternion.copy(q);
      this.group.add(line);
    }
    // Orient so the interface normal points "up" on screen (+Y): the half
    // above the boundary (G-phase) sits on top, the Cu matrix below.
    const nWorld = new THREE.Vector3(...V.norm(s.hkl));
    this.group.quaternion.setFromUnitVectors(nWorld, new THREE.Vector3(0, 1, 0));

    if (this.onCounts) this.onCounts(this.counts);
    this.renderFrame();
  }

  toggle(key, val) { this.show[key] = val; this.rebuild(); }
}
