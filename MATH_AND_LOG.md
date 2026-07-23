# Cu // G-phase CSL Visualizer — 개발 로그 & 수학 문서

> 저장소: https://github.com/mureds/csl_cu_g · 배포: https://mureds.github.io/csl_cu_g/
> 문서 최종 갱신: 2026-07-24

이 문서는 (1) GitHub에 올린 내용의 커밋별 로그와 (2) 계면 관계·방위관계(OR)·CSL을
**수학적으로 어떻게 계산하는지**를 상세히 기록한다.

> 표기: 벡터는 굵게(**n**, **p**), 정규화(단위)벡터는 `n̂` 처럼 표기. 디스플레이 수식은
> GitHub가 공식 지원하는 ` ```math ` (KaTeX) 코드펜스로 작성한다.

---

## Part 1. GitHub 업로드 로그 (커밋별)

브랜치 `main`, GitHub Pages는 *Deploy from a branch* (`main` / `root`)로 서빙.

| # | 커밋 | 시각(KST) | 내용 |
|---|------|-----------|------|
| 1 | `6d488a7` | 07-23 20:16 | **최초 버전.** 파라미터 구동형 CSL/근사일치 엔진(`csl.js`), 2D·3D 뷰, UI, Pages 워크플로우, README. |
| 2 | `4db6a41` | 07-23 20:19 | G-phase 기본값: a=11.2 Å, cube-on-cube. |
| 3 | `c53f5af` | 07-23 20:34 | **Bicrystal 분할**(위=G, 아래=Cu), 표시 격자 Simple Cubic 기본, **3D 회전 버그 수정**(Part 11). |
| 4 | `bc662ba` | 07-23 22:13 | **θ 슬라이더를 계면 법선축 twist로 통일.** |
| 5 | `bc7a788` | 07-23 22:19 | **단일 파일 빌드**(`standalone.html`). |
| 6 | `e6c540c` | 07-23 23:25 | **방위관계 지수 입력 모드** (hkl)_Cu ∥ (h'k'l')_G 등 (Part 6b). |
| 7 | `75978bc` | 07-23 23:49 | 조성 정정 Ni₁₆Ti₆Si₇ → **Mn₁₆Ni₆Si₇**, 표시 영역 최대 30→**50 Å**, 성능 개선(Part 11). |
| 8 | `64707f9` | 07-23 23:59 | 본 문서(`MATH_AND_LOG.md`) 추가. |

파일 구성:

```
index.html            메인 페이지 (ES 모듈 + three.js CDN importmap)
standalone.html       위 전체를 한 파일로 인라인한 배포본
css/style.css         스타일
js/csl.js             수학 엔진 (의존성 없음)
js/view2d.js          2D 계면 격자 캔버스
js/view3d.js          three.js 3D 렌더러
js/main.js            UI 배선 + 상태
.github/workflows/    (참고용, 현재 branch 배포라 미사용)
.nojekyll             Jekyll 비활성화
```

---

## Part 2. 좌표계와 표기 규약

- **공통 데카르트 좌표(lab frame)** 를 **Cu 결정축과 일치**시킨다. 즉 Cu의 [100],[010],[001]
  이 각각 lab의 x, y, z 축.
- 단위는 **옹스트롬(Å)**.
- 행렬 성분은 `M_ij` (행 i, 열 j).
- **입방정(cubic) 가정**: Cu·G 모두 입방. 이때 면 (hkl)의 법선 방향은 방향지수 [hkl] 과
  평행하다(입방정 특유의 성질). 이 성질을 계산 전반에서 사용한다.
- 회전행렬은 **능동 회전(active rotation)**: 격자를 실제로 돌린다.

---

## Part 3. 격자 생성 (`generateLattice`)

각 상은 관용 입방 단위격자 + 모티프(분율좌표)로 표현한다.

- SC: {(0,0,0)}
- BCC: {(0,0,0), (½,½,½)}
- FCC: {(0,0,0), (½,½,0), (½,0,½), (0,½,½)}

정수 셀 인덱스 (i,j,k) 와 모티프 **m** 에 대한 원자 위치 **p** (R = 그 상의 회전행렬):

```math
\mathbf{p} = R\,\big[(i+m_x)\,a,\;(j+m_y)\,a,\;(k+m_z)\,a\big]^{\mathsf{T}}
```

표시 영역 반폭 `R_max`(Å) 안, 즉 |p_x|,|p_y|,|p_z| ≤ `R_max` 인 원자만 남긴다. 인덱스 범위는
회전 시 모서리가 √3·`R_max` 까지 갈 수 있어 여유를 둔다:

```math
n = \left\lceil \frac{R_{\max}\,\gamma}{a}\right\rceil + 1,
\qquad
\gamma = \begin{cases} 1.75 & \text{(rotated)}\\[2pt] 1.02 & \text{(axis-aligned)}\end{cases}
```

Cu는 회전이 없으므로 좁은 범위(γ=1.02)와 행렬곱 생략으로 대용량에서도 빠르다.

---

## Part 4. 회전행렬 — Rodrigues 공식 (`rotationMatrix`)

단위 회전축 `û = (x,y,z)`, 각 θ 에 대한 회전행렬 (c=cos θ, s=sin θ, C=1−cos θ):

```math
R(\hat{\mathbf u},\theta)=
\begin{pmatrix}
c+x^2C & xyC - zs & xzC + ys\\
yxC + zs & c+y^2C & yzC - xs\\
zxC - ys & zyC + xs & c+z^2C
\end{pmatrix}
```

입력 축은 임의 [hkl] 을 정규화해서 사용한다.

---

## Part 5. 계면 법선 (h k l) — Miller 지수

**계면**은 두 결정이 맞닿는 평면, **계면 법선**은 그 평면에 수직한 방향이다. 입방정에서 면
(hkl) 의 단위 법선:

```math
\hat{\mathbf n} = \frac{(h,k,l)}{\sqrt{h^2+k^2+l^2}}
```

UI의 `계면 법선 (hkl)` 입력이 바로 이 (h,k,l). 예: `0 0 1` → 수평 계면(기본), `1 1 1` → 몸대각선
수직면, `1 1 0` → 면대각선 방향 면.

**계면 정면 좌표계 (`frameForPlane`)** — 2D 패널이 계면을 정면으로 눕혀 그리기 위해 법선 `n̂` 과
면내 기준방향 **d** 로 정규직교 기저 {ê₁, ê₂, n̂} 를 만든다(Gram–Schmidt):

```math
\hat{\mathbf e}_1 = \frac{\mathbf d - (\mathbf d\cdot\hat{\mathbf n})\,\hat{\mathbf n}}
{\lVert \mathbf d - (\mathbf d\cdot\hat{\mathbf n})\,\hat{\mathbf n}\rVert},
\qquad
\hat{\mathbf e}_2 = \hat{\mathbf n}\times\hat{\mathbf e}_1
```

(**d** 가 `n̂` 과 평행해 면내 성분이 0이면, `n̂` 과 안 나란한 임의 축을 골라 투영한다.) 점 **p** 의
면내 좌표는 (**p**·ê₁, **p**·ê₂), 면으로부터의 거리는 **p**·n̂.

---

## Part 6. 방위관계(OR)

OR은 계면을 사이에 두고 두 결정이 서로 얼마나 회전해 있는가이며, G상 회전행렬 `R_B` 로 표현된다
(Cu는 `R_A = I`). 지정 방식은 두 가지.

### 6a. 프리셋 방식

대표적 OR을 고정 회전으로 정의(입방정 CSL 회전):

| 프리셋 | 회전 |
|--------|------|
| cube-on-cube | I (정렬) |
| Σ5 36.87° [001] | R([001], 36.8699°) |
| Σ3 60° [111] | R([111], 60°) |
| Σ7 38.21° [111] | R([111], 38.2132°) |
| Kurdjumov–Sachs | R([111], 5.26°) (근사) |

### 6b. 지수 입력 방식: (hkl)\_Cu ∥ (h′k′l′)\_G, [uvw]\_Cu ∥ [u′v′w′]\_G

**이것이 정석적 OR 정의다.** OR은 두 평행조건으로 유일하게 결정된다:

```math
(h\,k\,l)_{Cu}\parallel(h'k'l')_{G}
\qquad\text{and}\qquad
[u\,v\,w]_{Cu}\parallel[u'v'w']_{G}
```

- **면 // 면**: 두 결정의 지정 면 법선을 같은 방향으로 → 회전축 1개 고정(2 자유도 제거).
- **방향 // 방향**: 그 면 안의 남은 회전(1 자유도)까지 고정.

**회전행렬 유도.** 각 결정에서 (면 법선, 면내 방향)으로 오른손 정규직교 기저를 만든다(Part 5와 동일).

Cu 기저(lab 좌표):

```math
\hat{\mathbf n}^{Cu}=\widehat{(h,k,l)},\quad
\hat{\mathbf e}_1^{Cu}=\widehat{\mathbf d_{Cu}^{\perp}},\quad
\hat{\mathbf e}_2^{Cu}=\hat{\mathbf n}^{Cu}\times\hat{\mathbf e}_1^{Cu}
```

여기서 면내 성분:

```math
\mathbf d_{Cu}^{\perp}=[uvw]-\big([uvw]\cdot\hat{\mathbf n}^{Cu}\big)\,\hat{\mathbf n}^{Cu}
```

G 기저(G 결정 좌표):

```math
\hat{\mathbf n}^{G}=\widehat{(h',k',l')},\quad
\hat{\mathbf e}_1^{G}=\widehat{\mathbf d_{G}^{\perp}},\quad
\hat{\mathbf e}_2^{G}=\hat{\mathbf n}^{G}\times\hat{\mathbf e}_1^{G}
```

이 기저벡터들을 **열**로 쌓아 행렬을 만든다:

```math
M_{Cu}=\big[\,\hat{\mathbf e}_1^{Cu}\;\big|\;\hat{\mathbf e}_2^{Cu}\;\big|\;\hat{\mathbf n}^{Cu}\,\big],
\qquad
M_{G}=\big[\,\hat{\mathbf e}_1^{G}\;\big|\;\hat{\mathbf e}_2^{G}\;\big|\;\hat{\mathbf n}^{G}\,\big]
```

`M_Cu`, `M_G` 는 오른손 정규직교 → **회전행렬 (SO(3))**. 구하려는 `R_B` 는 G의 각 기저벡터를
대응하는 Cu 기저벡터로 보내야 한다 (R_B·ê₁ᴳ = ê₁ᶜᵘ, R_B·n̂ᴳ = n̂ᶜᵘ, …). `M_G` 가 표준기저 **E**\_k 를
G의 k번째 기저로 보내므로:

```math
\boxed{\,R_B = M_{Cu}\,M_{G}^{\mathsf T}\,}
```

(`M_G` 가 직교라 M_G⁻¹ = M_Gᵀ.) **증명** (**g**\_k, **c**\_k = G·Cu의 k번째 기저벡터):

```math
R_B\,\mathbf g_k
= M_{Cu}M_G^{\mathsf T}\,M_G\hat{\mathbf E}_k
= M_{Cu}\hat{\mathbf E}_k
= \mathbf c_k \qquad\blacksquare
```

성분으로 쓰면 (코드 `rotationFromOR` 와 일치):

```math
(R_B)_{ij}=\sum_{k=0}^{2} (\mathbf c_k)_i\,(\mathbf g_k)_j
```

**의미**: 이 `R_B` 로 회전시키면 G의 (h′k′l′) 면이 Cu의 (hkl) 면과, G의 [u′v′w′] 의 면내 성분이
Cu의 [uvw] 의 면내 성분과 정확히 나란해진다 — 요청한 OR이 그대로 구현된다. 면 조건이 우선이고,
방향은 **면내 성분**으로 맞춘다(입력 방향이 면에 정확히 안 들어 있어도 안전).

**검증 예**: (111)∥(111), [1̄10]∥[1̄10] (동일 지수) → `M_Cu = M_G` → R_B = M_Cu·M_Cuᵀ = I →
cube-on-cube와 동일(일치점 최대). 앱에서 실측 확인됨.

### θ 추가 twist (두 방식 공통)

최종 G 회전은 위 기저 회전 `R_base`(프리셋 또는 지수입력) 위에 **계면 법선축 기준 twist** 를 더한 것:

```math
R_B = R(\hat{\mathbf n},\theta)\,\cdot\,R_{\text{base}}
```

θ 슬라이더는 어느 방식이든 항상 계면 법선을 축으로 추가 회전을 준다.

---

## Part 7. Bicrystal 분할 (위=G, 아래=Cu)

계면 평면(원점 통과, 법선 `n̂`) 기준 반공간 분할. 점 **p** 의 부호 s(**p**) = **p**·n̂ 에 대해:

```math
\text{Cu (matrix)}:\; s(\mathbf p)\le 0 \;\;(\text{below}),
\qquad
\text{G (precipitate)}:\; s(\mathbf p)\ge 0 \;\;(\text{above})
```

일치점은 분할된 두 집합 사이에서만 탐색하므로 자연히 계면 근처에만 나타난다. 또 화면상 "위=G,
아래=Cu"가 되도록 그룹 전체를 n̂ → +ŷ 로 보내는 쿼터니언을 적용한다.

---

## Part 8. 근사 일치(near-coincidence) 검출 (`findCoincidences`)

이종상 계면은 격자상수가 달라 완전 CSL이 아니라 **근사 일치**로 다룬다. G의 각 원자 **b** 에 대해
가장 가까운 Cu 원자와의 거리가 허용오차 ε 이내면 일치점:

```math
\min_{\mathbf a\in Cu}\lVert \mathbf a-\mathbf b\rVert \le \varepsilon,
\qquad \varepsilon = f\cdot a_{Cu}\;\;(f=\text{허용오차 슬라이더, 기본 }0.10)
```

효율을 위해 Cu 원자를 한 변 ε 의 균일 공간 해시에 넣고, 각 G 원자는 자신 셀 + 인접 26셀(3×3×3)만
검사 → 평균 O(N).

---

## Part 9. 정량 지표 (`misfitInfo`)

cube-on-cube류 계면의 격자상수 비·정합 배수·간격:

```math
r=\frac{a_G}{a_{Cu}},\qquad n=\mathrm{round}(r),\qquad d_{Cu}=a_{Cu},\qquad d_G=\frac{a_G}{n}
```

**선형 미스핏** δ 와 **무아레/근사 CSL 주기** D (간격 d_Cu, d_G 두 격자의 맥놀이):

```math
\delta = \frac{a_G - n\,a_{Cu}}{n\,a_{Cu}},
\qquad
D = \frac{d_{Cu}\,d_G}{\lvert d_{Cu}-d_G\rvert}
```

물리적으로 D는 계면에서 정합→비정합이 반복되는 초주기(미스핏 전위 간격 척도)다.

**현재 기본값** (a_Cu=3.615, a_G=11.2): r=3.0982, n=3, δ=+3.27 %, D≈114 Å.
계산: δ = (11.2 − 3×3.615)/(3×3.615) = 0.355/10.845 = 3.27 %,
D = 3.615×3.7333 / 0.1183 ≈ 114 Å.

---

## Part 10. 동일격자 CSL Σ 급수 (참고 표, `cslSeriesAboutAxis`)

동일 격자를 공통 축 [uvw](입방정) 둘레로 회전시킬 때의 **정확한 CSL** 은 Ranganathan 관계로
생성된다. N = u²+v²+w², 정수 m, p 에 대해:

```math
\Sigma' = m^2 + p^2 N,
\qquad
\Sigma = \frac{\Sigma'}{2^{\alpha}}\;\;(\Sigma'\text{에서 2의 인수를 모두 제거}),
\qquad
\theta = 2\arctan\!\left(\frac{p\sqrt{N}}{m}\right)
```

앱의 표는 축 = 계면 법선으로 두고 작은 Σ부터 보여준다. 이는 동일격자(같은 상) 기준의 참고값이며,
실제 이종상 계면 해석은 Part 8~9의 근사 일치·미스핏으로 제시한다. (예: [001] Σ5 → 36.87°,
[111] Σ3 → 60°, Σ7 → 38.21°.)

---

## Part 11. 렌더링 & 성능 (버그와 해결)

- **3D 회전이 안 되던 문제.** 원인 ①: 헤드리스/백그라운드 탭에서 `requestAnimationFrame` 루프가
  멈춰 카메라 변경이 다시 그려지지 않음 → **on-demand 렌더링**(OrbitControls `change` 이벤트에서만
  렌더). 원인 ②: `renderFrame` 안에서 `controls.update()` 호출 → `change` 재발생 → **무한 재귀
  (스택 오버플로우)** → `update()` 제거. WebGL 캡처 안정화를 위해 `preserveDrawingBuffer: true`.
- **컨트롤 갱신 멈춤.** rAF 기반 coalescing이 백그라운드에서 안 돌아 갱신 정지 →
  **`setTimeout(…, 30ms)` 기반 coalescing** 으로 교체.
- **대용량 최적화.** 축정렬 Cu 격자는 좁은 인덱스 범위 + 항등회전 생략; 2D는 계면 **슬랩만** 생성 후
  일치검출(수백만→수천 점); 3D 구는 원자 수에 따라 폴리곤 자동 감소(seg 14→5).
- **표시 영역.** 200 Å는 원자 수가 과중 → **최대 50 Å** 로 확정(약 Cu 1만 개, 부드럽게 동작).

---

## Part 12. 배포 (GitHub Pages)

- 저장소 `mureds/csl_cu_g`, 브랜치 `main`.
- Pages: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
- 갱신: 파일 수정 → `git add -A && git commit -m "…" && git push` → 1~2분 뒤 자동 반영
  (브라우저 캐시 때문에 `Ctrl+F5` 필요).
- three.js는 CDN(jsdelivr) importmap으로 로드 → 접속 시 인터넷 필요.

---

## 부록 A. 기본 파라미터

| 항목 | 값 |
|------|----|
| Cu 격자 | 표시 SC(물리적 FCC), a_Cu = 3.615 Å |
| G-phase | Mn₁₆Ni₆Si₇, 표시 SC(물리적 복합 FCC), a_G = 11.2 Å |
| 기본 OR | cube-on-cube |
| 계면 법선 | (0 0 1) |
| 일치 허용오차 | f = 0.10 (ε = 0.362 Å) |
| 표시 영역 | 16 Å (최대 50 Å) |

## 부록 B. 핵심 함수 위치

| 함수 | 파일 | 역할 |
|------|------|------|
| `rotationMatrix` | `js/csl.js` | Rodrigues 회전행렬 (Part 4) |
| `frameForPlane` | `js/csl.js` | 계면 정규직교 좌표계 (Part 5) |
| `rotationFromOR` | `js/csl.js` | 지수 입력 OR → 회전행렬 (Part 6b) |
| `generateLattice` | `js/csl.js` | 격자 원자 생성 (Part 3) |
| `findCoincidences` | `js/csl.js` | 근사 일치 검출 (Part 8) |
| `misfitInfo` | `js/csl.js` | 미스핏·무아레 (Part 9) |
| `cslSeriesAboutAxis` | `js/csl.js` | CSL Σ 급수 (Part 10) |
