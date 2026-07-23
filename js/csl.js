// csl.js — Coincidence Site Lattice / near-coincidence engine (dependency-free)
// All math is plain arrays [x,y,z]. Angstrom units throughout.

export const V = {
  add:  (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
  sub:  (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
  scale:(a, s) => [a[0]*s, a[1]*s, a[2]*s],
  dot:  (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2],
  cross:(a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
  len:  (a)    => Math.hypot(a[0], a[1], a[2]),
  norm: (a)    => { const l = V.len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; },
};

// --- Bravais motifs (fractional coords in the conventional cubic cell) ---
export const MOTIFS = {
  SC:  [[0,0,0]],
  BCC: [[0,0,0], [0.5,0.5,0.5]],
  FCC: [[0,0,0], [0.5,0.5,0], [0.5,0,0.5], [0,0.5,0.5]],
};

// --- Rodrigues rotation matrix about a (crystallographic) axis by angleDeg ---
export function rotationMatrix(axis, angleDeg) {
  const [x, y, z] = V.norm(axis);
  const t = angleDeg * Math.PI / 180;
  const c = Math.cos(t), s = Math.sin(t), C = 1 - c;
  return [
    [c + x*x*C,   x*y*C - z*s, x*z*C + y*s],
    [y*x*C + z*s, c + y*y*C,   y*z*C - x*s],
    [z*x*C - y*s, z*y*C + x*s, c + z*z*C],
  ];
}

export const IDENTITY = [[1,0,0],[0,1,0],[0,0,1]];

export function applyM(M, v) {
  return [
    M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
    M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
    M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
  ];
}

export function mulM(A, B) {
  const out = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      out[i][j] = A[i][0]*B[0][j] + A[i][1]*B[1][j] + A[i][2]*B[2][j];
  return out;
}

// Build a rotation that maps the crystal frame so a given plane normal (hkl)
// points along +Z and a chosen in-plane direction along +X. Used to view an
// arbitrary interface plane face-on in the 2D panel.
export function frameForPlane(hkl, inPlaneDir) {
  const n = V.norm(hkl);
  let x = inPlaneDir ? V.sub(inPlaneDir, V.scale(n, V.dot(inPlaneDir, n))) : null;
  if (!x || V.len(x) < 1e-6) {
    // pick any vector not parallel to n
    const seed = Math.abs(n[0]) < 0.9 ? [1,0,0] : [0,1,0];
    x = V.sub(seed, V.scale(n, V.dot(seed, n)));
  }
  x = V.norm(x);
  const y = V.cross(n, x);
  // rows map crystal coords -> frame coords (x,y,z=normal)
  return [x, y, n];
}

// --- Orientation relationship from parallel plane + direction pairs ----------
// Realizes  (planeCu) ∥ (planeG)  and  [dirCu] ∥ [dirG]  for cubic crystals,
// where a plane's normal is parallel to its Miller-index vector. Returns the
// rotation R that maps phase-G crystal vectors into the lab (Cu) frame, so that
// R·(planeG normal) ∥ planeCu normal and R·[dirG] ∥ [dirCu].
export function rotationFromOR(planeCu, dirCu, planeG, dirG) {
  const frame = (n0, d0) => {
    const n = V.norm(n0);
    let e1 = V.sub(d0, V.scale(n, V.dot(d0, n)));   // in-plane part of the direction
    if (V.len(e1) < 1e-8) {                          // direction ∥ normal → pick any in-plane axis
      const seed = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      e1 = V.sub(seed, V.scale(n, V.dot(seed, n)));
    }
    e1 = V.norm(e1);
    const e2 = V.cross(n, e1);
    return [e1, e2, n];                              // three orthonormal basis vectors
  };
  const c = frame(planeCu, dirCu);                  // Cu frame (basis vectors, in lab)
  const g = frame(planeG, dirG);                    // G frame (basis vectors, in G coords)
  // R = MCu · MGᵀ with M = [e1 e2 n] as columns → R maps each G basis vec to the Cu one.
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;                                    // R = MCu · MGᵀ  (columns = basis vecs)
      for (let k = 0; k < 3; k++) s += c[k][i] * g[k][j];
      R[i][j] = s;
    }
  return R;
}

// --- Generate atom positions of one phase within a cubic block of half-size R ---
// opts: { a, motif, rot (3x3 or null), origin, R (Angstrom half-extent) }
export function generateLattice({ a, motif, rot = null, origin = [0,0,0], R }) {
  const pts = [];
  // In rotated frame a corner can reach sqrt(3)*R, so pad the index range.
  const n = Math.ceil((R * 1.75) / a) + 1;
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++)
      for (let k = -n; k <= n; k++)
        for (const m of motif) {
          let p = [(i + m[0]) * a, (j + m[1]) * a, (k + m[2]) * a];
          if (rot) p = applyM(rot, p);
          p = V.add(p, origin);
          if (Math.abs(p[0]) <= R && Math.abs(p[1]) <= R && Math.abs(p[2]) <= R)
            pts.push(p);
        }
  return pts;
}

// --- Near-coincidence detection via uniform spatial hash on set A ---
// Returns [{a:[x,y,z], b:[x,y,z], d}] : each B point matched to nearest A within tol.
export function findCoincidences(ptsA, ptsB, tol) {
  const cell = Math.max(tol, 1e-6);
  const grid = new Map();
  const key = (x, y, z) => x + ',' + y + ',' + z;
  const gc = (v) => Math.round(v / cell);
  for (let idx = 0; idx < ptsA.length; idx++) {
    const p = ptsA[idx];
    const k = key(gc(p[0]), gc(p[1]), gc(p[2]));
    let arr = grid.get(k);
    if (!arr) grid.set(k, (arr = []));
    arr.push(idx);
  }
  const res = [];
  const tol2 = tol * tol;
  for (const pb of ptsB) {
    const bx = gc(pb[0]), by = gc(pb[1]), bz = gc(pb[2]);
    let best = -1, bestd = tol2;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const arr = grid.get(key(bx+dx, by+dy, bz+dz));
          if (!arr) continue;
          for (const idx of arr) {
            const pa = ptsA[idx];
            const d = (pa[0]-pb[0])**2 + (pa[1]-pb[1])**2 + (pa[2]-pb[2])**2;
            if (d < bestd) { bestd = d; best = idx; }
          }
        }
    if (best >= 0) res.push({ a: ptsA[best], b: pb, d: Math.sqrt(bestd) });
  }
  return res;
}

// --- Heterophase misfit / near-CSL summary for cube-on-cube-like interfaces ---
// Compares matrix spacing aCu against the best integer sub-multiple of aG.
export function misfitInfo(aCu, aG) {
  const r = aG / aCu;
  const n = Math.max(1, Math.round(r));      // aG ~ n * aCu
  const dCu = aCu;
  const dG = aG / n;
  const delta = (aG - n * aCu) / (n * aCu);  // relative linear misfit
  // 1-D moire / near-coincidence beat length between the two spacings
  const moire = Math.abs(dCu - dG) > 1e-9 ? (dCu * dG) / Math.abs(dCu - dG) : Infinity;
  return { r, n, delta, moire, dCu, dG };
}

// --- Exact same-lattice CSL Sigma for a rotation about a common axis (cubic) ---
// Classic Grimmer/Ranganathan generation: Sigma = h^2 + N*(u^2+v^2+w^2) reduced
// by removing factors of 2, with the CSL twist angle theta.
// Returns list of {sigma, theta} for small (u,v,w) around the given axis.
export function cslSeriesAboutAxis(axis, maxSigma = 51) {
  const [u, v, w] = axis.map(Math.round);
  const Nsq = u*u + v*v + w*w;
  if (Nsq === 0) return [];
  const out = [];
  const seen = new Set();
  for (let m = 1; m <= 20; m++) {
    for (let np = 0; np <= 20; np++) {
      if (m === 0 && np === 0) continue;
      let sigma = m*m + np*np*Nsq;
      let alpha = 1;
      while (sigma % 2 === 0) { sigma /= 2; alpha *= 2; }
      if (sigma < 1 || sigma > maxSigma) continue;
      const theta = 2 * Math.atan2(np * Math.sqrt(Nsq), m) * 180 / Math.PI;
      const kkey = sigma + '@' + theta.toFixed(3);
      if (seen.has(kkey)) continue;
      seen.add(kkey);
      out.push({ sigma, theta });
    }
  }
  out.sort((p, q) => p.sigma - q.sigma || p.theta - q.theta);
  return out;
}
