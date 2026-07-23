# Cu // G-phase — CSL / Near-Coincidence Boundary Visualizer

Cu(FCC) 기지와 G-phase 석출물 사이의 **CSL(Coincidence Site Lattice) / 근사 일치(near-coincidence) 경계**를
브라우저에서 2D·3D로 **동적** 시각화하는 정적 웹앱입니다. 외부 빌드 도구 없이 순수 ES 모듈 + Three.js(CDN)로 동작합니다.

> 📐 **수학·계산 방법과 개발 로그**는 [`MATH_AND_LOG.md`](MATH_AND_LOG.md) 참고 (계면 법선·방위관계 OR·CSL 유도 포함).

## 기능

- **3D 뷰** — 두 상의 원자 격자를 방위관계(OR)에 따라 배치하고, 계면(interface plane)과 일치 사이트를 강조. 드래그 회전 / 휠 확대.
- **2D 계면 격자** — 계면 평면에 투영한 두 격자망을 겹쳐 무아레(moiré) / 근사 CSL 패턴을 표시. 드래그 이동 / 휠 확대.
- **실시간 조절** — 격자상수 a(Cu, G-phase), 방위관계(프리셋 또는 `(hkl)_Cu ∥ (h'k'l')_G` + `[uvw]_Cu ∥ [u'v'w']_G` 지수 입력), 회전각 θ, 계면 법선 (hkl), 일치 허용오차, 표시 영역.
- **정량 지표** — a_G/a_Cu 비, 정합 배수 n, 선형 미스핏 δ(%), 무아레/근사 CSL 주기, 원자수, 그리고 참고용 동일격자 CSL Σ 급수표.

## 정확한 값 반영하기

`js/main.js` 상단 `DEFAULTS` 를 실제 값으로 교체하면 됩니다:

```js
const DEFAULTS = {
  aCu: 3.615,     // Cu FCC 격자상수 (Å)
  aG:  11.2,      // G-phase (Mn16Ni6Si7) FCC 격자상수 (Å)
  ...
};
```

방위관계(OR)를 추가하려면 `js/main.js` 의 `OR_PRESETS` 에 회전축·각도를 추가하세요.
G-phase의 전체 원자 배열(복합 FCC, ~116 atoms)이 필요하면 CIF의 Wyckoff 좌표를 모티프로 넣을 수 있습니다(요청 시 확장).

## 로컬 실행

ES 모듈이므로 `file://` 이 아닌 로컬 서버가 필요합니다:

```bash
cd csl-cu-gphase
python -m http.server 8000
# http://localhost:8000
```

## GitHub Pages 배포

1. 이 폴더를 리포지토리 루트로 push (예: `mureds/csl-cu-gphase`).
2. GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions** 선택.
3. `.github/workflows/deploy.yml` 이 자동 배포. 완료 후 `https://mureds.github.io/csl-cu-gphase/` 접속.

> 참고: `three.js` 는 CDN(jsdelivr)에서 로드하므로 배포/접속 시 인터넷이 필요합니다.
> 오프라인이 필요하면 `three.module.js` 를 리포에 vendoring 하고 importmap 경로를 로컬로 바꾸세요.

## 물리적 배경 (요약)

- 두 상의 격자상수 비가 정수에 가까울 때(cube-on-cube, a_G ≈ n·a_Cu) 계면은 반정합(semi-coherent)이 되고,
  미스핏 δ = (a_G − n·a_Cu)/(n·a_Cu) 로부터 미스핏 전위 간격 ≈ 무아레 주기 D = d_Cu·d_G / |d_Cu − d_G| 로 추정됩니다.
- 동일격자 CSL Σ 급수는 참고용이며(입방정, 회전축=계면 법선), 이종상 계면에는 근사 일치(near-coincidence) 해석을 함께 제시합니다.
