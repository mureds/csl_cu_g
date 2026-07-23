# Cu // G-phase CSL Visualizer — 개발 로그 & 수학 문서

> 저장소: https://github.com/mureds/csl_cu_g · 배포: https://mureds.github.io/csl_cu_g/
> 문서 최종 갱신: 2026-07-24

이 문서는 (1) GitHub에 올린 내용의 커밋별 로그와 (2) 계면 관계·방위관계(OR)·CSL을
**수학적으로 어떻게 계산하는지**를 상세히 기록한다. 수식은 GitHub의 `$...$`(인라인),
`$$...$$`(블록) 렌더링을 사용한다.

---

## Part 1. GitHub 업로드 로그 (커밋별)

모든 시각은 KST, 2026-07-23~24. 브랜치는 `main`, GitHub Pages는 *Deploy from a branch*
(`main` / `root`)로 서빙.

| # | 커밋 | 시각 | 내용 |
|---|------|------|------|
| 1 | `6d488a7` | 07-23 20:16 | **최초 버전.** 파라미터 구동형 CSL/근사일치 엔진(`csl.js`), 2D(`view2d.js`)·3D(`view3d.js`), UI(`main.js`), `index.html`, `style.css`, Pages 워크플로우, README. |
| 2 | `4db6a41` | 07-23 20:19 | G-phase 기본값 확정: a=11.2 Å, cube-on-cube. |
| 3 | `c53f5af` | 07-23 20:34 | **Bicrystal 분할**(계면 위=G, 아래=Cu), 표시 격자 Simple Cubic 기본값, **3D 드래그 회전 버그 수정**(아래 Part 11). |
| 4 | `bc662ba` | 07-23 22:13 | **θ 슬라이더를 계면 법선축 twist로 통일** — 프리셋과 무관하게 항상 회전이 적용되도록. |
| 5 | `bc7a788` | 07-23 22:19 | **단일 파일 빌드**(`standalone.html`) 추가 — CSS/JS 전부 인라인. |
| 6 | `e6c540c` | 07-23 23:25 | **방위관계 지수 입력 모드** 추가: `(hkl)_Cu ∥ (h'k'l')_G` + `[uvw]_Cu ∥ [u'v'w']_G` (아래 Part 6b). |
| 7 | `75978bc` | 07-23 23:49 | 조성 정정 `Ni₁₆Ti₆Si₇` → **`Mn₁₆Ni₆Si₇`**, 표시 영역 최대 30→**50 Å**, 성능 개선(Part 11). |

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

- **공통 데카르트 좌표(lab frame)** 를 사용하며, 이는 **Cu 결정축과 일치**시킨다.
  즉 Cu의 $[100],[010],[001]$ 이 각각 lab의 $x,y,z$ 축.
- 단위는 **옹스트롬(Å)**.
- 벡터는 열벡터 $\mathbf{v}=(v_x,v_y,v_z)^\mathsf{T}$, 행렬 $M$의 성분은 $M_{ij}$ (행 $i$, 열 $j$).
- **입방정(cubic) 가정**: Cu·G-phase 모두 입방. 이때 면 $(hkl)$의 법선 방향은
  방향지수 $[hkl]$ 과 평행하다(입방정 특유의 성질). 이 성질을 계산 전반에서 사용한다.
- 회전행렬 $R$ 은 항상 **능동 회전(active rotation)**: 물체(격자)를 돌린다.

---

## Part 3. 격자 생성 (`generateLattice`)

각 상은 관용 입방 단위격자 + 모티프(motif)로 표현한다. 분율좌표(fractional) 모티프:

$$
\text{SC}:\{(0,0,0)\},\quad
\text{BCC}:\{(0,0,0),(\tfrac12,\tfrac12,\tfrac12)\},\quad
\text{FCC}:\{(0,0,0),(\tfrac12,\tfrac12,0),(\tfrac12,0,\tfrac12),(0,\tfrac12,\tfrac12)\}
$$

정수 셀 인덱스 $(i,j,k)$ 와 모티프 $\mathbf{m}$ 에 대해 원자 위치는

$$
\mathbf{p} = R\,\big[(i+m_x)\,a,\ (j+m_y)\,a,\ (k+m_z)\,a\big]^\mathsf{T}
$$

여기서 $a$ 는 격자상수, $R$ 은 그 상의 회전행렬(Cu는 $R=I$, G는 OR 회전). 표시 영역
반폭 $R_{\max}$(Å) 안($|p_x|,|p_y|,|p_z|\le R_{\max}$)의 원자만 남긴다.

인덱스 범위: 회전이 있으면 모서리가 $\sqrt3\,R_{\max}$ 까지 갈 수 있어 여유를 둔다.

$$
n = \Big\lceil \frac{R_{\max}\cdot \gamma}{a}\Big\rceil + 1,\qquad
\gamma = \begin{cases} 1.75 & (\text{회전 있음})\\ 1.02 & (\text{축정렬, 회전 없음})\end{cases}
$$

Cu는 회전이 없으므로 좁은 범위($\gamma=1.02$)와 행렬곱 생략으로 대용량에서도 빠르다.

---

## Part 4. 회전행렬 — Rodrigues 공식 (`rotationMatrix`)

단위 회전축 $\hat{\mathbf{u}}=(x,y,z)$, 각 $\theta$ 에 대한 회전행렬:

$$
R(\hat{\mathbf u},\theta)=
\begin{pmatrix}
c+x^2C & xyC - zs & xzC + ys\\
yxC + zs & c+y^2C & yzC - xs\\
zxC - ys & zyC + xs & c+z^2C
\end{pmatrix},\quad
c=\cos\theta,\ s=\sin\theta,\ C=1-c.
$$

입력 축은 임의 $[hkl]$ 을 정규화해서 사용한다.

---

## Part 5. 계면 법선 $(h\,k\,l)$ — Miller 지수의 의미

**계면(interface)** 은 두 결정이 맞닿는 평면이고, **계면 법선**은 그 평면에 수직한
방향이다. 입방정에서 면 $(hkl)$ 의 단위 법선은

$$
\hat{\mathbf n} = \frac{(h,k,l)}{\sqrt{h^2+k^2+l^2}}.
$$

UI의 `계면 법선 (hkl)` 입력이 바로 이 $(h,k,l)$ 이다. 예:
- `0 0 1` → $\hat{\mathbf n}=(0,0,1)$, 수평 계면(기본값)
- `1 1 1` → 정육면체 몸대각선에 수직한 면
- `1 1 0` → 면대각선 방향 면

### 계면을 정면으로 보는 좌표계 (`frameForPlane`)

2D 패널은 계면을 화면에 정면으로 눕혀 그린다. 이를 위해 법선 $\hat{\mathbf n}$ 과
면내(in-plane) 기준방향으로 **정규직교 좌표계** $\{\hat{\mathbf e}_1,\hat{\mathbf e}_2,\hat{\mathbf n}\}$ 를 만든다(Gram–Schmidt):

$$
\hat{\mathbf e}_1 = \frac{\mathbf d - (\mathbf d\!\cdot\!\hat{\mathbf n})\,\hat{\mathbf n}}{\lVert \cdot \rVert},\qquad
\hat{\mathbf e}_2 = \hat{\mathbf n}\times\hat{\mathbf e}_1.
$$

($\mathbf d$ 가 $\hat{\mathbf n}$ 과 평행해 면내 성분이 0이면, $\hat{\mathbf n}$ 과 안 나란한
임의의 축을 골라 투영한다.) 임의 점 $\mathbf p$ 의 면내 좌표는
$(\,\mathbf p\!\cdot\!\hat{\mathbf e}_1,\ \mathbf p\!\cdot\!\hat{\mathbf e}_2\,)$,
면으로부터의 거리는 $\mathbf p\!\cdot\!\hat{\mathbf n}$.

---

## Part 6. 방위관계(OR) — 핵심

OR은 **계면을 사이에 두고 두 결정이 서로 얼마나 회전해 있는가**이며, G상에 적용되는
회전행렬 $R_B$ 로 표현된다(Cu는 $R_A=I$). 두 가지 지정 방식이 있다.

### 6a. 프리셋 방식

대표적 OR을 고정 회전으로 정의한다(입방정 CSL 회전):

| 프리셋 | 회전 |
|---|---|
| cube-on-cube | $I$ (정렬) |
| Σ5 36.87° [001] | $R([001],36.8699^\circ)$ |
| Σ3 60° [111] | $R([111],60^\circ)$ |
| Σ7 38.21° [111] | $R([111],38.2132^\circ)$ |
| Kurdjumov–Sachs | $R([111],5.26^\circ)$ (근사) |

### 6b. 지수 입력 방식 — $(hkl)_{Cu}\parallel(h'k'l')_{G}$, $[uvw]_{Cu}\parallel[u'v'w']_{G}$

**이것이 사용자가 요청한 정석적 OR 정의다.** OR은 두 개의 평행조건으로 유일하게 결정된다:

$$
\boxed{(h\,k\,l)_{Cu}\parallel(h'k'l')_{G}}\qquad\text{그리고}\qquad
\boxed{[u\,v\,w]_{Cu}\parallel[u'v'w']_{G}}
$$

- **면 // 면**: 두 결정의 지정 면 법선이 같은 방향을 향하게 함 → 회전축 1개를 고정(2 자유도 제거).
- **방향 // 방향**: 그 면 안에서의 남은 회전(1 자유도)까지 고정.

#### 회전행렬 유도

각 결정에서 (면 법선, 면내 방향)으로 **오른손 정규직교 기저**를 만든다(Part 5와 동일한 Gram–Schmidt).

Cu 기저(lab 좌표에서):
$$
\hat{\mathbf n}^{Cu}=\widehat{(h,k,l)},\quad
\hat{\mathbf e}_1^{Cu}=\widehat{\mathbf d_{Cu}^{\perp}},\quad
\hat{\mathbf e}_2^{Cu}=\hat{\mathbf n}^{Cu}\times\hat{\mathbf e}_1^{Cu},
$$
여기서 $\mathbf d_{Cu}^{\perp}=[uvw]-([uvw]\!\cdot\!\hat{\mathbf n}^{Cu})\hat{\mathbf n}^{Cu}$ (면내 성분).

G 기저(G 결정 좌표에서):
$$
\hat{\mathbf n}^{G}=\widehat{(h',k',l')},\quad
\hat{\mathbf e}_1^{G}=\widehat{\mathbf d_{G}^{\perp}},\quad
\hat{\mathbf e}_2^{G}=\hat{\mathbf n}^{G}\times\hat{\mathbf e}_1^{G}.
$$

이 기저벡터들을 **열**로 쌓아 행렬을 만든다:

$$
M_{Cu}=\big[\ \hat{\mathbf e}_1^{Cu}\ \big|\ \hat{\mathbf e}_2^{Cu}\ \big|\ \hat{\mathbf n}^{Cu}\ \big],\qquad
M_{G}=\big[\ \hat{\mathbf e}_1^{G}\ \big|\ \hat{\mathbf e}_2^{G}\ \big|\ \hat{\mathbf n}^{G}\ \big].
$$

$M_{Cu},M_{G}$ 는 오른손 정규직교 → **회전행렬(SO(3))**. 구하려는 $R_B$ 는 G의 각 기저벡터를
대응하는 Cu 기저벡터로 보내야 한다: $R_B\,\hat{\mathbf e}_1^{G}=\hat{\mathbf e}_1^{Cu}$,
$R_B\,\hat{\mathbf n}^{G}=\hat{\mathbf n}^{Cu}$ 등. $M_G$ 가 표준기저 $\hat{\mathbf E}_k$ 를
$k$번째 기저벡터로 보내므로($M_G\hat{\mathbf E}_k=$ G의 $k$번째 기저), 다음이 성립:

$$
\boxed{\,R_B = M_{Cu}\,M_{G}^{\mathsf T}\,}
$$

($M_G$ 가 직교라 $M_G^{-1}=M_G^{\mathsf T}$.) **증명**: $R_B\,(\text{G의 }k\text{번째 기저})
=M_{Cu}M_G^{\mathsf T}M_G\hat{\mathbf E}_k=M_{Cu}\hat{\mathbf E}_k=(\text{Cu의 }k\text{번째 기저})$. ∎

성분으로 쓰면(코드 `rotationFromOR` 와 일치), $\mathbf c_k,\mathbf g_k$ 를 각각 Cu·G의 $k$번째 기저벡터라 할 때

$$
(R_B)_{ij}=\sum_{k=0}^{2} (\mathbf c_k)_i\,(\mathbf g_k)_j .
$$

**의미**: 이 $R_B$ 로 회전시키면 G의 $(h'k'l')$ 면이 Cu의 $(hkl)$ 면과, G의 $[u'v'w']$ 의
면내 성분이 Cu의 $[uvw]$ 의 면내 성분과 정확히 나란해진다 — 즉 요청한 OR이 그대로 구현된다.
면 조건이 우선이고, 방향은 **면내 성분**으로 맞춘다(입력 방향이 면에 정확히 안 들어 있어도 안전).

**검증 예**: $(111)\!\parallel\!(111)$, $[1\bar10]\!\parallel\![1\bar10]$ (동일 지수) → $M_{Cu}=M_G$ →
$R_B=M_{Cu}M_{Cu}^{\mathsf T}=I$ → cube-on-cube와 동일(일치점 최대). 앱에서 실측 확인됨.

### θ 추가 twist (두 방식 공통)

최종 G 회전은 위에서 구한 기저 회전 $R_{\text{base}}$ (프리셋 또는 지수입력) 위에 **계면 법선축 기준 twist** 를 더한 것:

$$
R_B = R(\hat{\mathbf n},\theta)\,\cdot\,R_{\text{base}}.
$$

θ 슬라이더는 프리셋이든 지수입력이든 항상 계면 법선을 축으로 추가 회전을 준다.

---

## Part 7. Bicrystal 분할 (계면 위=G, 아래=Cu)

계면 평면(원점 통과, 법선 $\hat{\mathbf n}$)을 기준으로 반공간을 나눈다. 점 $\mathbf p$ 의 부호
$s(\mathbf p)=\mathbf p\!\cdot\!\hat{\mathbf n}$ 에 대해:

$$
\text{Cu(기지)}:\ s(\mathbf p)\le 0\quad(\text{아래}),\qquad
\text{G(석출물)}:\ s(\mathbf p)\ge 0\quad(\text{위}).
$$

일치점(coincidence)은 분할된 두 집합 사이에서만 탐색하므로 자연히 **계면 근처에만** 나타난다.
또한 3D 표시에서 화면상 "위=G, 아래=Cu"가 되도록, 그룹 전체를 $\hat{\mathbf n}\to +\hat{\mathbf y}$
로 보내는 쿼터니언 $q$ ($\hat{\mathbf n}$ 을 화면 위쪽으로) 를 적용한다.

---

## Part 8. 근사 일치(near-coincidence) 검출 (`findCoincidences`)

이종상 계면은 격자상수가 달라 완전 CSL이 아니라 **근사 일치(near-coincidence)** 로 다룬다.
G의 각 원자 $\mathbf b$ 에 대해 Cu 원자 중 가장 가까운 것을 찾아, 거리가 허용오차 이내면 일치점으로 표시:

$$
\min_{\mathbf a\in Cu}\lVert \mathbf a-\mathbf b\rVert \le \varepsilon,\qquad
\varepsilon = f\cdot a_{Cu}\ \ (f=\text{허용오차 슬라이더, 기본 }0.10).
$$

효율을 위해 Cu 원자를 한 변 $\varepsilon$ 의 **균일 공간 해시(uniform grid hash)** 에 넣고,
각 G 원자는 자신이 속한 셀과 인접 26셀($3\times3\times3$)만 검사한다 → 평균 $O(N)$.

---

## Part 9. 정량 지표 (`misfitInfo`)

cube-on-cube류 계면에서 격자상수 비와 미스핏:

$$
r=\frac{a_G}{a_{Cu}},\qquad n=\mathrm{round}(r)\ \ (\text{정합 배수}),\qquad
d_{Cu}=a_{Cu},\ \ d_G=\frac{a_G}{n}.
$$

**선형 미스핏(정합 오차)**:

$$
\delta = \frac{a_G - n\,a_{Cu}}{n\,a_{Cu}}.
$$

**무아레/근사 CSL 주기** — 간격 $d_{Cu},d_G$ 두 격자의 맥놀이(beat):

$$
D = \frac{d_{Cu}\,d_G}{\lvert d_{Cu}-d_G\rvert}.
$$

물리적으로 $D$ 는 계면에서 정합→비정합이 반복되는 초주기(미스핏 전위 간격의 척도)다.

**현재 기본값 예** ($a_{Cu}=3.615,\ a_G=11.2$): $r=3.0982,\ n=3,\ \delta=+3.27\%,\ D\approx114\ \text{Å}$.
($\delta=(11.2-3\times3.615)/(3\times3.615)=0.355/10.845=3.27\%$, $D=3.615\times3.7333/0.1183\approx114$.)

---

## Part 10. 동일격자 CSL Σ 급수 (참고 표, `cslSeriesAboutAxis`)

동일 격자를 공통 축 $[uvw]$(입방정) 둘레로 회전시킬 때의 **정확한 CSL** 은 Ranganathan 관계로
생성된다. $N=u^2+v^2+w^2$, 정수 $m,p$ 에 대해

$$
\Sigma' = m^2 + p^2 N,\qquad
\Sigma = \frac{\Sigma'}{2^\alpha}\ (\Sigma'\text{에서 2의 인수를 모두 제거해 홀수로}),
$$
$$
\theta = 2\arctan\!\Big(\frac{p\sqrt{N}}{m}\Big).
$$

앱의 표는 **축 = 계면 법선** 으로 두고 작은 Σ부터 정렬해 보여준다. 이는 동일격자(같은 상) 기준의
참고값이며, 실제 이종상 계면 해석은 Part 8~9의 근사 일치·미스핏으로 제시한다.
(예: [001] 축 Σ5 → θ=36.87°, [111] 축 Σ3 → θ=60°, Σ7 → θ=38.21°.)

---

## Part 11. 렌더링 & 성능 (버그와 해결)

- **3D 회전이 안 되던 문제(커밋 c53f5af, bc662ba 전후).** 원인 ①: 헤드리스/백그라운드 탭에서
  `requestAnimationFrame` 루프가 멈춰 카메라 변경이 다시 그려지지 않음 → **on-demand 렌더링**
  (OrbitControls의 `change` 이벤트에서만 렌더)로 전환. 원인 ②: `renderFrame` 안에서
  `controls.update()` 호출 → `change` 재발생 → **무한 재귀(스택 오버플로우)** → `update()` 제거.
  또한 WebGL 캡처 안정화를 위해 `preserveDrawingBuffer: true`.
- **컨트롤 갱신 지연/멈춤(커밋 75978bc).** `requestAnimationFrame` 기반 coalescing이 백그라운드에서
  안 돌아 갱신이 멈춤 → **`setTimeout(…,30ms)` 기반 coalescing** 으로 교체(백그라운드에서도 실행).
- **대용량 최적화.** 축정렬 Cu 격자는 좁은 인덱스 범위 + 항등회전 생략(Part 3); 2D는 계면
  **슬랩만** 생성 후 일치검출(수백만→수천 점); 3D 구는 원자 수에 따라 **폴리곤 자동 감소**(seg 14→5).
- **표시 영역.** 처음 200 Å 시도 시 원자 수가 수십만~수백만으로 과중 → **최대 50 Å** 로 확정
  (50 Å에서 Cu 약 1만 개 수준, 부드럽게 동작).

---

## Part 12. 배포 (GitHub Pages)

- 저장소 `mureds/csl_cu_g`, 브랜치 `main`.
- Pages: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
  (저장소에 Actions 워크플로우도 있으나, Pages를 branch 배포로 설정했으므로 현재는 미사용.)
- 최초엔 Pages 미활성으로 404였고, 소스 지정 후 최초 빌드까지 수 분 소요됐다.
- 갱신 절차: 파일 수정 → `git add -A && git commit -m "…" && git push` → 1~2분 뒤 자동 반영
  (브라우저는 캐시 때문에 `Ctrl+F5` 강력 새로고침 필요).
- three.js는 CDN(jsdelivr) importmap으로 로드 → 접속 시 인터넷 필요.

---

## 부록 A. 기본 파라미터

| 항목 | 값 |
|---|---|
| Cu 격자 | 표시 SC(물리적 FCC), $a_{Cu}=3.615$ Å |
| G-phase | Mn₁₆Ni₆Si₇, 표시 SC(물리적 복합 FCC), $a_G=11.2$ Å |
| 기본 OR | cube-on-cube |
| 계면 법선 | $(0\,0\,1)$ |
| 일치 허용오차 | $f=0.10$ ($\varepsilon=0.362$ Å) |
| 표시 영역 | 16 Å (최대 50 Å) |

## 부록 B. 핵심 함수 위치

| 함수 | 파일 | 역할 |
|---|---|---|
| `rotationMatrix` | `js/csl.js` | Rodrigues 회전행렬 (Part 4) |
| `frameForPlane` | `js/csl.js` | 계면 정규직교 좌표계 (Part 5) |
| `rotationFromOR` | `js/csl.js` | 지수 입력 OR → 회전행렬 (Part 6b) |
| `generateLattice` | `js/csl.js` | 격자 원자 생성 (Part 3) |
| `findCoincidences` | `js/csl.js` | 근사 일치 검출 (Part 8) |
| `misfitInfo` | `js/csl.js` | 미스핏·무아레 (Part 9) |
| `cslSeriesAboutAxis` | `js/csl.js` | CSL Σ 급수 (Part 10) |
