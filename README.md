# 310관 산책 — 모바일 등각 맵 프로토타입

중앙대학교 서울캠퍼스 **310관(100주년기념관)** 외부에서 시작해 입구로 이동하고, 전환 연출 뒤 1층 로비를 탐색하는 독립형 웹 게임입니다. 1층의 히스토리 월에 접근하면 안내 패널을 열 수 있습니다.

> 이 저장소는 교육용 게임의 UI/이동 흐름을 검증하기 위한 프로토타입입니다. 실제 길찾기 또는 건물 안전 안내 용도가 아닙니다.

## 실행

빌드나 설치가 필요 없습니다. `index.html`을 정적 웹 서버로 열면 됩니다.

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`에 접속합니다. 모바일과 데스크톱 모두 바닥을 터치/클릭해 이동합니다. 입구·전시·출구 표식을 선택하면 이동 후 상호작용합니다. WASD/방향키와 Space도 사용할 수 있습니다.

## GitHub Pages

Repository Settings → Pages → **Deploy from a branch**에서 `main` / `(root)`를 선택하면 배포됩니다. 배포 URL 형식은 아래와 같습니다.

`https://sdsl-fellow.github.io/low-poly-map/`

## 공간 자료와 표현 범위

- [중앙대학교 장애학생지원센터 찾아오시는 길](https://able.cau.ac.kr/pages/am/am_4.php): 서울캠퍼스 주소와 310관(100주년기념관) 명칭을 확인했습니다.
- [중앙대학교 통합상황실 안내](https://www.cau.ac.kr/cms/FR_CON/index.do?MENU_ID=1760): 310관의 공식 건물 명칭을 교차 확인했습니다.
- [중앙대학교 2026 신입생 학사가이드](https://www.cse.cau.ac.kr/file/2026_haksa_guide_2.pdf): 공식 캠퍼스 시설 자료를 보조 참고했습니다.
- 외관은 밝은 석재 매스, 유리 출입부, `310` 식별 표시를 단순화한 **창작 low-poly 표현**입니다. 실제 치수나 입면을 재현한 모델이 아닙니다.

상세 1층 평면도와 현장 사진이 제공되지 않아 아래 요소는 모두 **검증 전 임시 배치**입니다.

- 외부 광장, 보행로, 화단, 벤치 및 입구 접근 동선
- 1층 로비의 범위와 벽체, 출입구 위치
- 안내 데스크, 벤치, 화분, 히스토리 월의 위치 및 전시 내용
- 장애물 크기와 통행 가능 구역

따라서 게임 속 1층을 실제 310관의 정확한 실내 구조로 해석해서는 안 됩니다. 현장 도면/사진을 확보하면 `scenes.inside`의 배치와 Canvas 렌더링 요소를 교체해야 합니다.

## 구현 및 테스트

- 반응형 Canvas 기반 등각 투영, 외부/실내 2개 장면
- 터치 목적지 이동, 장애물 우회 경로 탐색, 키보드 대체 조작
- 바닥 경계·건물·가구 충돌(AABB)과 벽 통과 방지
- 입구/출구 근접 상호작용, 장면 전환, 히스토리 월 안내 패널
- 계정, 개인정보, Google Sheets, Apps Script, 외부 분석 도구 없음
- 시스템 글꼴과 Canvas 도형만 사용하여 제3자 이미지 자산 없음

### 모바일 검증 체크리스트

| 항목 | 기대 결과 |
|---|---|
| 360 × 800 세로 화면 | UI가 안전 영역 안에 표시되고 게임 화면이 잘리지 않음 |
| 터치 이동 | 터치한 목적지로 이동, 다시 터치하면 새 경로로 변경 |
| 외부 → 입구 | 건물/화단을 통과하지 않고 입구 근처에서 `들어가기` 표시 |
| 장면 전환 | 암전 연출 뒤 1층 로비와 새 목표 표시 |
| 실내 탐색 | 벽·데스크·벤치를 통과하지 않음 |
| 히스토리 월 | 근접 시 `살펴보기`, 터치 시 안내 패널 표시 |
| 1층 → 외부 | 하단 출구에서 외부 장면으로 복귀 |
| 가로/회전 | Canvas 해상도와 UI가 현재 뷰포트에 재배치 |

자동화된 브라우저가 없는 환경에서는 위 체크리스트를 실제 휴대전화에서 최종 확인해야 합니다. iOS Safari/Android Chrome에서 외부 진입부터 히스토리 월까지 한 번씩 완료하는 것을 권장합니다.

## 구조

- `index.html` — 접근 가능한 UI와 패널
- `styles.css` — 모바일 안전 영역, 전환 및 안내 UI
- `game.js` — 등각 렌더링, 이동, 충돌, 장면/상호작용 상태

## 2026-09-26 · Architectural revision / tap to walk

- Replaced the joystick with Pointer Events tap/click navigation. The walkable grid is searched for reachable cells, paths are smoothed only with collision-clear segments, and a second tap replaces the current destination. An obstructed destination snaps to the nearest reachable cell. Character clearance prevents corner cutting.
- Entrance, exhibit and exit labels accept taps: walk to the label, then interact on arrival. WASD/arrows and Space remain available. Focus loss clears input.
- Exterior: stepped limestone mass, repeated vertical windows, horizontal glazed band, glazed lower level, roof terrace planting and broad lateral stairs.
- Lobby: pale tiled floor, tall columns, partial upper gallery with glass railings, restrained timber tones and a dark blue-grey donor plaque wall.
- Reference photographs were viewed during the revision. No reference photographs are bundled as game assets; all architecture is rendered as original Canvas geometry.
  - [Exterior photograph showing building number 310](https://www.thongtinduhochanquoc.com/content/images/2023/05/c71a6cbaeecb8ccd9ef035f790957a0b.jpeg), published in [Chung-Ang campus overview](https://www.thongtinduhochanquoc.com/truong-dai-hoc-chung-ang-han-quoc/).
  - [IOHSK conference venue gallery](https://www.iohsk.net/conference-rooms), specifically [DONORS WALL and upper gallery photograph](https://images.squarespace-cdn.com/content/v1/6931f7de6fc8645158be5897/6ea8df3a-e55e-4a40-89f5-cd958af74af5/514330631_1040057014941344_1656635833624135281_n.jpg).
- The source gallery covers several campus locations; its photo does not establish a surveyed first-floor plan. The scene is an architectural interpretation, with adapted proportions and a provisional layout. The former history panel is now labelled as a donor-wall-inspired memorial exhibit; plaque text and actual historical exhibits are not invented.

### Revision verification

`node --check game.js` and `git diff --check` passed. A Node VM running the actual game loop with a native Canvas renderer exercised pointer taps at 390×844, 1200×900 and 844×390. Entrance → lobby → exhibit → exit passed at all three sizes; obstacle-target navigation completed without entering collision geometry. Rendered scenes were inspected. This is a simulation of the Canvas logic, not an iOS/Android browser test. Browser automation could not start because its Chromium download failed; actual device testing remains pending.
