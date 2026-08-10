import type { BookPage, BookProject, DesignElement, PageKind } from './types';
import { getPageSize, uid } from './types';

const text = (name: string, content: string, x: number, y: number, w: number, h: number, fontSizePt = 16, color = '#2b2d2b', z = 10): DesignElement => ({
  id: uid('txt'), kind: 'text', name, content, x, y, w, h, rotation: 0, z,
  style: { fontFamily: 'Pretendard, "Noto Sans KR", Arial, sans-serif', fontSizePt, fontWeight: 500, lineHeight: 1.35, letterSpacingEm: -0.02, color, textAlign: 'left', opacity: 1 }
});

const shape = (name: string, x: number, y: number, w: number, h: number, fill: string, z = 1): DesignElement => ({
  id: uid('shape'), kind: 'shape', shape: 'rect', name, x, y, w, h, rotation: 0, z,
  style: { fill, stroke: 'transparent', strokeWidthMm: 0, opacity: 1, borderRadiusMm: 0 }
});

export function pageFromTemplate(kind: PageKind, project: Pick<BookProject, 'settings'>): BookPage {
  const p: BookPage = { id: uid('page'), kind, name: '새 페이지', background: '#f8f5ee', elements: [] };
  const size = getPageSize(p, project.settings);

  if (kind === 'cover') {
    const { trimWidthMm: tw, trimHeightMm: th, bleedMm: b, spineMm: s } = project.settings;
    p.name = '겉표지 · 뒷표지 · 세네카';
    p.background = '#efe7d8';
    const frontX = b + tw + s;
    p.elements.push(shape('전면 포인트', frontX + 12, b + 18, tw - 24, 4, '#d95f53', 2));
    p.elements.push(text('앞표지 제목', '내 마음\n플레이리스트', frontX + 16, b + 38, tw - 32, 45, 31, '#28312b', 10));
    p.elements.push(text('앞표지 부제', '시편으로 듣는 내 마음 · 청소년 4주 28트랙', frontX + 16, b + 88, tw - 32, 20, 12, '#596a60', 10));
    const spine = text('책등 제목', '내 마음 플레이리스트', b + tw + 1.5, b + th / 2 - 5, Math.max(s - 3, 5), 10, 9, '#28312b', 10);
    spine.rotation = 90;
    p.elements.push(spine);
    p.elements.push(text('뒷표지 소개', '마음이 복잡할 때, 시편을 재생해 보세요.\n28개의 트랙을 따라 기분을 체크하고, 라이너 노트를 읽고, 나만의 가사를 써 봅니다.', b + 16, b + 34, tw - 32, 72, 12, '#3e443f', 10));
    p.elements.push(text('뒷표지 하단', 'PSALM NEXT · YOUTH DEVOTIONAL', b + 16, b + th - 30, tw - 32, 12, 8, '#7b756a', 10));
  } else if (kind === 'front') {
    p.name = '전자책 앞표지';
    p.background = '#f0eadf';
    p.elements.push(shape('상단 바', 16, 22, size.widthMm - 32, 3.5, '#d95f53', 2));
    p.elements.push(text('앞표지 제목', '내 마음\n플레이리스트', 18, 52, size.widthMm - 36, 50, 31, '#28312b'));
    p.elements.push(text('앞표지 부제', '시편으로 듣는 내 마음 · 청소년 4주 28트랙', 18, 112, size.widthMm - 36, 20, 12, '#596a60'));
    p.elements.push(text('시리즈', 'PSALM NEXT 01', 18, 190, size.widthMm - 36, 10, 8, '#857d70'));
  } else if (kind === 'half-title') {
    p.name = '반표제지';
    p.elements.push(text('반표제', '내 마음 플레이리스트', 22, 88, size.widthMm - 44, 26, 22, '#2c332e'));
    p.elements[0].style.textAlign = 'center';
  } else if (kind === 'title') {
    p.name = '속표지';
    p.elements.push(text('시리즈', 'PSALM NEXT 01', 22, 48, size.widthMm - 44, 12, 8, '#8c8a80'));
    p.elements[p.elements.length - 1].style.textAlign = 'center';
    p.elements.push(text('제목', '내 마음\n플레이리스트', 22, 67, size.widthMm - 44, 54, 30, '#28312b'));
    p.elements[p.elements.length - 1].style.textAlign = 'center';
    p.elements.push(text('부제', '시편으로 듣는 내 마음 · 청소년 4주 28트랙', 22, 128, size.widthMm - 44, 24, 12, '#69776f'));
    p.elements[p.elements.length - 1].style.textAlign = 'center';
  } else if (kind === 'copyright') {
    p.name = '속표지 뒷장 · 판권';
    p.background = '#fbfaf6';
    p.elements.push(text('판권', '내 마음 플레이리스트\n시편으로 듣는 내 마음 · 청소년 4주 28트랙\n\n기획·편집: __________________\n발행: __________________\n전자책 제작: MakeBook Studio\n\n성경 본문: 개역개정\n교회 내부 사용 시 기관의 저작권 정책을 확인하세요.', 22, 50, size.widthMm - 44, 122, 10, '#555b56'));
  } else if (kind === 'track') {
    p.name = 'TRACK 페이지';
    p.background = '#faf7f0';
    p.elements.push(text('트랙 번호', 'TRACK 01', 16, 18, 52, 12, 9, '#7a867d'));
    p.elements.push(text('트랙 제목', '원본 그대로', 16, 34, size.widthMm - 32, 20, 22, '#2c332e'));
    const psalm = text('시편', 'PSALM 139', 16, 59, 35, 10, 8, '#ffffff');
    psalm.style.fill = '#66796e'; psalm.style.borderRadiusMm = 5; psalm.style.textAlign = 'center'; p.elements.push(psalm);
    p.elements.push(text('기분 체크', '기분 체크   ○ 무난함   ○ 눈치 보임   ○ 지침   ○ 궁금함   ○ 그냥그럼', 16, 78, size.widthMm - 32, 18, 10, '#3d433f'));
    const liner = text('라이너 노트', 'LINER NOTE\n우리는 하루 종일 보정하며 살아요. 그런데 시편은 보정 전 원본으로 하나님 앞에 서는 법을 가르쳐 줍니다. 이곳에 실제 원고를 넣고, 카드·플레이어·파형 요소를 이미지와 함께 레이어링하세요.', 16, 104, size.widthMm - 32, 58, 11, '#343a36');
    liner.style.fill = '#eee8dc'; liner.style.borderRadiusMm = 4; p.elements.push(liner);
    const lyrics = text('내 가사 쓰기', 'MY LYRICS\n하나님, 사실 저의 원본은 ________________________________', 16, 170, size.widthMm - 32, 28, 11, '#343a36');
    lyrics.style.fill = '#e7eee8'; lyrics.style.borderRadiusMm = 4; p.elements.push(lyrics);
  } else if (kind === 'back') {
    p.name = '전자책 뒷표지';
    p.background = '#5e7065';
    p.elements.push(text('뒷표지 카피', '마음이 복잡한 날마다\n시편 한 트랙을 재생해 보세요.\n\n기분을 숨기지 않고 하나님께 가져가는 법,\n내 마음의 언어를 말씀으로 다시 쓰는 법을\n28일 동안 함께 연습합니다.', 22, 46, size.widthMm - 44, 100, 17, '#ffffff'));
    p.elements.push(text('하단', 'PSALM NEXT · YOUTH DEVOTIONAL', 22, 190, size.widthMm - 44, 10, 8, '#e6eee8'));
  } else {
    p.name = kind === 'chapter' ? '주차 시작면' : '본문 페이지';
    p.elements.push(text('제목', kind === 'chapter' ? '1주차 · 마음 사용 설명서' : '본문 제목', 18, 22, size.widthMm - 36, 25, kind === 'chapter' ? 25 : 18, '#2c332e'));
    p.elements.push(text('본문', '텍스트를 선택하고 오른쪽 패널에서 글꼴, 크기, 행간, 자간, 색상, 정렬, 위치를 수정하세요. 이미지는 업로드한 뒤 자유롭게 드래그·리사이즈하고 텍스트 위·아래로 레이어 순서를 바꿀 수 있습니다.', 18, 58, size.widthMm - 36, 110, 11, '#3d433f'));
  }
  return p;
}

export function createDefaultProject(): BookProject {
  const project: BookProject = {
    version: 1,
    title: '내 마음 플레이리스트',
    author: '',
    language: 'ko',
    identifier: 'urn:uuid:' + crypto.randomUUID(),
    settings: { trimWidthMm: 152, trimHeightMm: 225, bleedMm: 3, safeMm: 12, spineMm: 9, dpi: 300, snapMm: 1 },
    fonts: [],
    pages: [],
    updatedAt: new Date().toISOString()
  };
  project.pages = [
    pageFromTemplate('cover', project),
    pageFromTemplate('front', project),
    pageFromTemplate('half-title', project),
    pageFromTemplate('title', project),
    pageFromTemplate('copyright', project),
    pageFromTemplate('chapter', project),
    pageFromTemplate('track', project),
    pageFromTemplate('back', project)
  ];
  return project;
}
