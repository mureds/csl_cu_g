// view2d.js — 2D interface-plane net with pan/zoom, drawn on a canvas.
import { V, generateLattice, findCoincidences, frameForPlane, applyM, mulM } from './csl.js';

export class View2D {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 22;          // px per Angstrom
    this.cx = 0; this.cy = 0; // pan offset (px)
    this.slabT = 0.6;         // Angstrom half-thickness of the interface slab
    this._drag = null;
    this._bind();
  }

  _bind() {
    const c = this.cv;
    c.addEventListener('mousedown', (e) => { this._drag = [e.clientX, e.clientY]; });
    window.addEventListener('mouseup', () => { this._drag = null; });
    window.addEventListener('mousemove', (e) => {
      if (!this._drag) return;
      this.cx += e.clientX - this._drag[0];
      this.cy += e.clientY - this._drag[1];
      this._drag = [e.clientX, e.clientY];
      this.render();
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      this.scale = Math.max(3, Math.min(120, this.scale * f));
      this.render();
    }, { passive: false });
  }

  resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.cv.width = r.width * dpr;
    this.cv.height = r.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width; this.h = r.height;
  }

  setState(s) { this.state = s; this.compute(); }

  // Build the projected 2D nets for the current state.
  compute() {
    const s = this.state;
    const R = s.region;
    // Crystal-frame rotation that brings the interface plane face-on.
    const F = frameForPlane(s.hkl, s.inPlane);
    const toFrame = (p) => applyM(F, p);

    // Twist of phase B about the interface normal, expressed in crystal frame.
    // s.rotB is already the 3x3 OR rotation for phase B.
    // Keep only atoms within the thin interface slab BEFORE the (expensive)
    // coincidence search — the 2D net is a plane, so at large display regions
    // this drops the working set from millions to a few thousand points.
    const n = F[2]; // interface-plane normal (frame z-row)
    const inSlab = (p) => Math.abs(n[0]*p[0] + n[1]*p[1] + n[2]*p[2]) <= this.slabT;
    const ptsA = generateLattice({ a: s.aCu, motif: s.motifCu, rot: s.rotA, R }).filter(inSlab);
    const ptsB = generateLattice({ a: s.aG,  motif: s.motifG,  rot: s.rotB, R }).filter(inSlab);

    this.coin = findCoincidences(ptsA, ptsB, s.tol);

    this.A = ptsA.map(toFrame);
    this.B = ptsB.map(toFrame);
    this.C = this.coin.map((c) => toFrame(c.b));
    this.render();
  }

  X(x) { return this.w / 2 + this.cx + x * this.scale; }
  Y(y) { return this.h / 2 + this.cy - y * this.scale; }

  render() {
    if (!this.state) return;
    const g = this.ctx;
    g.clearRect(0, 0, this.w, this.h);
    // background grid
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 1;
    const step = this.scale;
    for (let x = (this.cx % step + this.w/2 % step); x < this.w; x += step) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, this.h); g.stroke();
    }

    const dot = (p, r, fill, stroke) => {
      const px = this.X(p[0]), py = this.Y(p[1]);
      if (px < -20 || px > this.w+20 || py < -20 || py > this.h+20) return;
      g.beginPath(); g.arc(px, py, r, 0, 2*Math.PI);
      g.fillStyle = fill; g.fill();
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
    };

    for (const p of this.A) dot(p, 4.2, 'rgba(232,138,58,0.9)');       // Cu
    for (const p of this.B) dot(p, 3.2, 'rgba(90,160,255,0.85)');     // G-phase
    for (const p of this.C) {                                         // coincidences
      const px = this.X(p[0]), py = this.Y(p[1]);
      g.beginPath(); g.arc(px, py, 9, 0, 2*Math.PI);
      g.strokeStyle = 'rgba(80,230,140,0.95)'; g.lineWidth = 2; g.stroke();
    }

    // scale bar
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.font = '12px system-ui, sans-serif';
    const barA = 5; // Angstrom
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(16, this.h-18); g.lineTo(16 + barA*this.scale, this.h-18); g.stroke();
    g.fillText(barA + ' Å', 16, this.h-24);
  }
}
