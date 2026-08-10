import type { BookPage, BookProject, DesignElement, PageKind } from './types';
import { getPageSize, uid } from './types';

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;
const C = {
  paper: '#f7f2e9', paper2: '#fbf8f1', ink: '#2d322f', muted: '#77786f', sage: '#64786b', sage2: '#dfe8df',
  coral: '#cf7068', blush: '#edd7d1', olive: '#a8ad83', cream: '#efe5d5', cocoa: '#6f5a4e', line: '#cfc8bc', dark: '#4f6257'
};

const text = (name: string, content: string, x: number, y: number, w: number, h: number, fontSizePt = 16, color = C.ink, z = 10, weight = 500): DesignElement => ({
  id: uid('txt'), kind: 'text', name, content, x, y, w, h, rotation: 0, z,
  style: { fontFamily: 'Pretendard, "Noto Sans KR", Arial, sans-serif', fontSizePt, fontWeight: weight, lineHeight: 1.4, letterSpacingEm: -0.025, color, textAlign: 'left', opacity: 1 }
});

const shape = (name: string, x: number, y: number, w: number, h: number, fill: string, z = 1, radius = 0, opacity = 1): DesignElement => ({
  id: uid('shape'), kind: 'shape', shape: 'rect', name, x, y, w, h, rotation: 0, z,
  style: { fill, stroke: 'transparent', strokeWidthMm: 0, opacity, borderRadiusMm: radius }
});

const line = (name: string, x: number, y: number, w: number, stroke = C.line, z = 5, width = .35): DesignElement => ({
  id: uid('line'), kind: 'line', name, x, y, w, h: 1, rotation: 0, z,
  style: { stroke, strokeWidthMm: width, opacity: 1 }
});

const image = (name: string, src: string, x: number, y: number, w: number, h: number, z = 4, opacity = 1, rotation = 0): DesignElement => ({
  id: uid('img'), kind: 'image', name, src, alt: name, x, y, w, h, rotation, z,
  style: { objectFit: 'contain', opacity }
});

function pill(content: string, x: number, y: number, w: number, fill: string, color = '#fff', z = 12) {
  const bg = shape(`${content} 배경`, x, y, w, 9, fill, z - 1, 4.5);
  const t = text(content, content, x + 2, y + 1.2, w - 4, 6.5, 7.6, color, z, 700);
  t.style.textAlign = 'center';
  return [bg, t];
}

function shadowCard(name: string, x: number, y: number, w: number, h: number, fill: string, z = 3, radius = 4) {
  return [shape(`${name} 그림자`, x + 1.6, y + 1.8, w, h, '#8b8177', z, radius, .12), shape(name, x, y, w, h, fill, z + 1, radius, 1)];
}

function paperTexture(w: number, h: number): DesignElement {
  const el = image('미세 종이 패턴', asset('paper-grid.svg'), 0, 0, w, h, 0, .55);
  el.style.objectFit = 'fill';
  el.locked = true;
  return el;
}

function createCoverSpread(project: Pick<BookProject, 'settings'>): BookPage {
  const { trimWidthMm: tw, trimHeightMm: th, bleedMm: b, spineMm: s } = project.settings;
  const p: BookPage = { id: uid('page'), kind: 'cover', name: '겉표지 전체 펼침 · 시범본', background: C.paper, elements: [] };
  const frontX = b + tw + s;
  const totalW = b * 2 + tw * 2 + s;
  p.elements.push(paperTexture(totalW, th + b * 2));
  p.elements.push(shape('세네카', b + tw, b, s, th, C.sage, 2));
  p.elements.push(shape('앞표지 코랄 바', frontX + 13, b + 18, 5, 45, C.coral, 3, 2.5));
  p.elements.push(text('시리즈', 'PSALM NEXT 01', frontX + 25, b + 20, 92, 9, 8, C.muted, 10, 800));
  p.elements.push(text('앞표지 제목', '내 마음\n플레이리스트', frontX + 24, b + 35, 112, 50, 31, C.ink, 10, 800));
  p.elements.push(text('앞표지 부제', '시편으로 듣는 내 마음\n청소년 4주 · 28 TRACKS', frontX + 25, b + 88, 105, 24, 11, C.sage, 10, 600));
  p.elements.push(image('프리미엄 카세트', asset('cassette-premium.svg'), frontX + 58, b + 121, 82, 56, 8, 1, -2));
  p.elements.push(image('프리미엄 헤드폰', asset('headphones-premium.svg'), frontX + 6, b + 131, 58, 58, 7, .96, 2));
  p.elements.push(image('스티커', asset('playlist-stickers.svg'), frontX + 8, b + 168, 52, 52, 5, .78, -6));
  p.elements.push(text('앞표지 하단', '하루 10분, 기분 체크부터 내 가사 쓰기까지', frontX + 25, b + 201, 108, 10, 8, C.cocoa, 10, 650));

  p.elements.push(text('뒷표지 상단', 'PLAY WHAT YOU FEEL.', b + 18, b + 24, 100, 12, 9, C.coral, 10, 800));
  p.elements.push(text('뒷표지 카피', '마음은 숨기는 게 아니라\n가져가는 거라는 것.', b + 18, b + 43, 116, 32, 20, C.ink, 10, 800));
  p.elements.push(text('뒷표지 소개', '성경 한가운데에는 150곡짜리 플레이리스트가 있어요.\n밝은 찬양만이 아니라 따지는 기도, 눈물, 배신, 기다림까지.\n하나님은 그런 마음을 삭제하지 않으셨어요.\n\n28일 동안 하루 한 트랙씩, 시편과 함께 내 마음을 들어 봅니다.', b + 18, b + 84, 112, 73, 10.5, C.ink, 10, 500));
  p.elements.push(image('뒷표지 파형', asset('waveform-premium.svg'), b + 18, b + 163, 112, 26, 5, .55));
  p.elements.push(...pill('4 WEEKS', b + 18, b + 193, 33, C.sage));
  p.elements.push(...pill('28 TRACKS', b + 55, b + 193, 39, C.coral));
  p.elements.push(...pill('10 MIN / DAY', b + 98, b + 193, 42, C.cocoa));
  const spineTitle = text('세네카 제목', '내 마음 플레이리스트', b + tw + 1.1, b + 48, Math.max(s - 2.2, 5), 126, 8.2, '#fff', 12, 800);
  spineTitle.rotation = 90; spineTitle.style.textAlign = 'center'; p.elements.push(spineTitle);
  return p;
}

function createFront(project: Pick<BookProject, 'settings'>): BookPage {
  const p: BookPage = { id: uid('page'), kind: 'front', name: '전자책 앞표지 · 시범본', background: C.paper, elements: [] };
  const size = getPageSize(p, project.settings); p.elements.push(paperTexture(size.widthMm, size.heightMm));
  p.elements.push(shape('세로 포인트', 14, 17, 4, 48, C.coral, 2, 2));
  p.elements.push(text('시리즈', 'PSALM NEXT 01', 24, 18, 105, 10, 8, C.muted, 10, 800));
  p.elements.push(text('제목', '내 마음\n플레이리스트', 23, 35, 108, 50, 31, C.ink, 10, 800));
  p.elements.push(text('부제', '시편으로 듣는 내 마음\n청소년 4주 · 28트랙', 24, 89, 103, 24, 11, C.sage, 10, 600));
  p.elements.push(image('카세트', asset('cassette-premium.svg'), 63, 126, 76, 50, 8, 1, -4));
  p.elements.push(image('헤드폰', asset('headphones-premium.svg'), 9, 134, 56, 56, 7, .96, 4));
  p.elements.push(image('파형', asset('waveform-premium.svg'), 22, 184, 108, 22, 4, .52));
  p.elements.push(text('하단', '하루 10분 · 기분 체크 · 라이너 노트 · 내 가사 쓰기', 22, 207, 108, 8, 7.5, C.cocoa, 10, 650));
  return p;
}

function createTitle(project: Pick<BookProject, 'settings'>): BookPage {
  const p: BookPage = { id: uid('page'), kind: 'title', name: '속표지 · 시범본', background: C.paper2, elements: [] };
  const size = getPageSize(p, project.settings); p.elements.push(paperTexture(size.widthMm, size.heightMm));
  p.elements.push(image('작은 파형', asset('waveform-premium.svg'), 43, 32, 66, 13, 3, .34));
  const series = text('시리즈', 'PSALM NEXT · YOUTH DEVOTIONAL', 24, 52, 104, 10, 8, C.muted, 10, 800); series.style.textAlign = 'center'; p.elements.push(series);
  const title = text('제목', '내 마음\n플레이리스트', 20, 70, 112, 50, 29, C.ink, 10, 800); title.style.textAlign = 'center'; p.elements.push(title);
  const sub = text('부제', '시편으로 듣는 내 마음 — 청소년 4주 28트랙', 26, 126, 100, 18, 10.5, C.sage, 10, 600); sub.style.textAlign = 'center'; p.elements.push(sub);
  p.elements.push(image('미니 헤드폰', asset('headphones-premium.svg'), 58, 158, 36, 36, 5, .72));
  p.elements.push(line('하단선', 46, 204, 60, C.line, 3, .3));
  const foot = text('하단문구', '하루 10분, 기분 체크부터 내 가사 쓰기까지', 30, 207, 92, 7, 7.2, C.muted, 10, 500); foot.style.textAlign = 'center'; p.elements.push(foot);
  return p;
}

function createCopyright(project: Pick<BookProject, 'settings'>): BookPage {
  const p: BookPage = { id: uid('page'), kind: 'copyright', name: '속표지 뒷장 · 판권 시범본', background: '#f8f4ec', elements: [] };
  const size = getPageSize(p, project.settings); p.elements.push(paperTexture(size.widthMm, size.heightMm));
  p.elements.push(...shadowCard('판권 카드', 18, 36, 116, 143, '#fffdf8', 2, 5));
  p.elements.push(text('판권 제목', 'ABOUT THIS PLAYLIST', 27, 49, 96, 10, 8.5, C.coral, 10, 800));
  p.elements.push(text('판권 본문', '내 마음 플레이리스트\n시편으로 듣는 내 마음 — 청소년 4주 28트랙\n\n시편 넥스트 시리즈(청소년) 1\n본문: 개역개정\n\n저자  __________________\n기획·편집  __________________\n발행  __________________\n전자책 제작  MakeBook Studio\n\n본 전자책의 이미지·조판 요소는 책의 디자인을 위해 제작되었습니다.\n교회 내부 활용과 외부 배포 시 적용되는 성경 본문 및 각 자료의 저작권 정책을 확인해 주세요.', 27, 65, 96, 102, 9.3, C.ink, 10, 500));
  p.elements.push(image('스티커', asset('playlist-stickers.svg'), 100, 166, 30, 30, 6, .42, 5));
  p.elements.push(text('버전', 'MAKEBOOK / FIXED LAYOUT READY', 20, 202, 112, 8, 7.2, C.muted, 10, 700));
  return p;
}

function createWeekOne(project: Pick<BookProject, 'settings'>): BookPage {
  const p: BookPage = { id: uid('page'), kind: 'chapter', name: '1주차 · 마음 사용 설명서', background: C.paper, elements: [] };
  const size = getPageSize(p, project.settings); p.elements.push(paperTexture(size.widthMm, size.heightMm));
  p.elements.push(text('주차 번호', 'WEEK 01', 17, 20, 42, 10, 9, C.coral, 10, 800));
  p.elements.push(text('주차 제목', '마음 사용\n설명서', 17, 37, 82, 40, 28, C.ink, 10, 800));
  p.elements.push(text('주차 소개', '첫 주에는 마음을 다루는 기본기를 배워요.\n시편이 가르쳐 주는 규칙은 하나예요.\n마음은 숨기는 게 아니라 가져가는 거라는 것.\n어디로? 다 들어 주시는 분 앞으로.', 17, 85, 84, 54, 11.2, C.ink, 10, 500));
  p.elements.push(image('헤드폰', asset('headphones-premium.svg'), 95, 32, 43, 43, 6, .86, 5));
  p.elements.push(image('스티커', asset('playlist-stickers.svg'), 96, 79, 43, 43, 4, .48, -5));
  p.elements.push(...shadowCard('큐 카드', 17, 148, 118, 58, '#fffdf8', 2, 5));
  p.elements.push(text('큐 제목', 'UP NEXT · 7 TRACKS', 25, 157, 96, 8, 8, C.sage, 10, 800));
  p.elements.push(text('큐 목록', '01  원본 그대로                 PSALM 139\n02  마음 쏟는 법                 PSALM 62\n03  따져도 되는 기도             PSALM 13\n04  눈물 저장소                   PSALM 56\n05  나에게 말 걸기               PSALM 42\n06  그래도 자는 밤                PSALM 3\n07  모두의 최애곡                 PSALM 23', 25, 170, 98, 30, 7.6, C.ink, 10, 600));
  return p;
}

function createTrackOneA(project: Pick<BookProject, 'settings'>): BookPage {
  const p: BookPage = { id: uid('page'), kind: 'track', name: 'TRACK 01 · 원본 그대로 / A', background: C.paper2, elements: [] };
  const size = getPageSize(p, project.settings); p.elements.push(paperTexture(size.widthMm, size.heightMm));
  p.elements.push(text('트랙 번호', 'TRACK 01', 16, 16, 42, 9, 9, C.coral, 10, 800));
  p.elements.push(text('트랙 제목', '원본 그대로', 16, 30, 90, 22, 23, C.ink, 10, 800));
  p.elements.push(...pill('PSALM 139', 16, 55, 34, C.sage));
  p.elements.push(image('파형', asset('waveform-premium.svg'), 55, 49, 80, 18, 5, .6));
  p.elements.push(image('플레이어 UI', asset('player-premium.svg'), 15, 70, 122, 24, 6, 1));

  p.elements.push(...shadowCard('기분 카드', 16, 103, 120, 28, C.sage2, 2, 5));
  p.elements.push(text('기분 라벨', 'MOOD CHECK', 23, 110, 28, 7, 7.6, C.sage, 10, 800));
  p.elements.push(text('기분 선택', '○ 무난함     ○ 눈치 보임     ○ 지침\n○ 궁금함     ○ 그냥그럼', 23, 119, 102, 10, 8.4, C.ink, 10, 600));

  p.elements.push(...shadowCard('가사 카드', 16, 140, 120, 56, '#fffdf8', 2, 5));
  p.elements.push(text('가사 라벨', 'TODAY’S LYRIC', 23, 149, 38, 8, 7.6, C.coral, 10, 800));
  p.elements.push(text('성경 구절', '“내가 주께 감사하옴은\n나를 지으심이 심히 기묘하심이라\n주께서 하시는 일이 기이함을\n내 영혼이 잘 아나이다”', 23, 160, 99, 28, 13.2, C.ink, 10, 700));
  p.elements.push(text('구절표기', '시편 139:14', 99, 189, 25, 6, 7.5, C.muted, 10, 700));
  p.elements.push(image('하단 스티커', asset('playlist-stickers.svg'), 113, 197, 24, 24, 5, .32, 8));
  return p;
}

function createTrackOneB(project: Pick<BookProject, 'settings'>): BookPage {
  const p: BookPage = { id: uid('page'), kind: 'track', name: 'TRACK 01 · 원본 그대로 / B', background: C.paper, elements: [] };
  const size = getPageSize(p, project.settings); p.elements.push(paperTexture(size.widthMm, size.heightMm));
  p.elements.push(text('상단', 'TRACK 01  ·  LINER NOTE', 16, 17, 84, 9, 8.5, C.sage, 10, 800));
  p.elements.push(image('미니 파형', asset('waveform-premium.svg'), 102, 13, 34, 12, 4, .4));
  p.elements.push(...shadowCard('라이너 카드', 16, 34, 120, 82, C.cream, 2, 5));
  p.elements.push(text('라이너 제목', '보정 전 원본으로도 이미 작품', 24, 44, 101, 14, 14.5, C.ink, 10, 800));
  p.elements.push(text('라이너 노트', '우리는 하루 종일 보정하며 살아요. 사진도, 말투도, 프사도. 진짜 나를 알면 사람들이 실망할까 봐요.\n\n그런데 이 곡의 시인은 이미 다 들킨 사람이에요. 앉고 일어서는 것, 말하기 전의 생각까지 다 아시는 분 앞에 있거든요(139:2). 무섭죠? 근데 반전이 있어요. 다 아시는 그분의 결론이 “삭제”가 아니라 “심히 기묘하다”, 그러니까 “정말 잘 만들었다”예요.\n\n나는 보정 전 원본으로도 이미 작품이라는 것. 이 사실 위에서 4주를 시작할 거예요.', 24, 62, 101, 47, 9.2, C.ink, 10, 500));

  p.elements.push(...shadowCard('내 가사 카드', 16, 126, 120, 34, C.sage2, 2, 5));
  p.elements.push(text('내 가사 라벨', 'MY LYRIC', 24, 135, 29, 7, 7.5, C.sage, 10, 800));
  p.elements.push(text('내 가사 내용', '“하나님, 사실 저의 원본은 __________________ 해요.”\n뒤를 솔직하게 채워 보세요. 아무도 안 봐요. 그분 빼고는.', 24, 145, 102, 12, 9.1, C.ink, 10, 600));

  p.elements.push(...shadowCard('한 소절 카드', 16, 169, 78, 34, C.blush, 2, 5));
  p.elements.push(text('한 소절 라벨', 'ONE LINE', 23, 177, 25, 7, 7.2, C.coral, 10, 800));
  p.elements.push(text('한 소절', '나를 지으심이\n심히 기묘하심이라', 23, 187, 62, 14, 10.2, C.ink, 10, 800));
  p.elements.push(...shadowCard('기도 카드', 99, 169, 37, 34, C.dark, 2, 5));
  p.elements.push(text('기도 라벨', 'PRAYER', 105, 177, 25, 7, 7.2, '#dfe8df', 10, 800));
  p.elements.push(text('기도', '보정 없는 저를 이미 아시고 잘 만들었다 하시는 하나님, 그 말씀을 오늘 하루 믿어 볼게요. 아멘.', 105, 187, 25, 13, 6.8, '#fff', 10, 600));
  p.elements.push(text('다음 트랙', 'NEXT  →  TRACK 02 · 마음 쏟는 법 · PSALM 62', 16, 211, 120, 7, 7.2, C.muted, 10, 700));
  return p;
}

function createBack(project: Pick<BookProject, 'settings'>): BookPage {
  const p: BookPage = { id: uid('page'), kind: 'back', name: '전자책 뒷표지 · 시범본', background: C.dark, elements: [] };
  const size = getPageSize(p, project.settings);
  p.elements.push(image('배경 파형', asset('waveform-premium.svg'), 9, 144, 134, 38, 2, .13));
  p.elements.push(text('상단', 'END OF SIDE A?  NOT YET.', 20, 24, 112, 10, 8.5, '#d8e2da', 10, 800));
  p.elements.push(text('카피', '오늘 마음이\n엉망이면\n엉망인 채로 오세요.', 20, 48, 112, 58, 26, '#fff', 10, 800));
  p.elements.push(text('설명', '시편은 잘 정리된 마음이 아니라\n진짜 마음을 위해 만들어진 노래니까요.\n\n하루 한 트랙. 28일 뒤에는\n당신만의 시편 한 곡이 남습니다.', 20, 119, 104, 50, 11, '#edf3ee', 10, 500));
  p.elements.push(image('카세트', asset('cassette-premium.svg'), 73, 167, 66, 44, 6, .9, -5));
  p.elements.push(text('하단', 'PSALM NEXT 01 · YOUTH DEVOTIONAL', 20, 207, 112, 8, 7.2, '#cad6cd', 10, 700));
  return p;
}

export function pageFromTemplate(kind: PageKind, project: Pick<BookProject, 'settings'>): BookPage {
  if (kind === 'cover') return createCoverSpread(project);
  if (kind === 'front') return createFront(project);
  if (kind === 'title' || kind === 'half-title') return createTitle(project);
  if (kind === 'copyright') return createCopyright(project);
  if (kind === 'chapter') return createWeekOne(project);
  if (kind === 'track') return createTrackOneA(project);
  if (kind === 'back') return createBack(project);
  const p: BookPage = { id: uid('page'), kind, name: '본문 페이지', background: C.paper2, elements: [] };
  const size = getPageSize(p, project.settings); p.elements.push(paperTexture(size.widthMm, size.heightMm));
  p.elements.push(text('제목', '본문 제목', 18, 24, size.widthMm - 36, 20, 19, C.ink, 10, 800));
  p.elements.push(text('본문', '텍스트와 이미지를 자유롭게 배치하세요. 이미지 위에 실제 텍스트를 조판하고, 위치·크기·폰트·색상을 편집할 수 있습니다.', 18, 58, size.widthMm - 36, 80, 11, C.ink, 10, 500));
  return p;
}

export function createDefaultProject(): BookProject {
  const project: BookProject = {
    version: 1,
    title: '내 마음 플레이리스트 · 시범 조판',
    author: '',
    language: 'ko',
    identifier: 'urn:uuid:' + crypto.randomUUID(),
    settings: { trimWidthMm: 152, trimHeightMm: 225, bleedMm: 3, safeMm: 12, spineMm: 9, dpi: 300, snapMm: 1 },
    fonts: [], pages: [], updatedAt: new Date().toISOString()
  };
  project.pages = [
    createCoverSpread(project),
    createFront(project),
    createTitle(project),
    createCopyright(project),
    createWeekOne(project),
    createTrackOneA(project),
    createTrackOneB(project),
    createBack(project)
  ];
  return project;
}
