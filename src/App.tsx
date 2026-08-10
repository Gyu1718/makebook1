import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { createDefaultProject, pageFromTemplate } from './defaultProject';
import { exportCurrentPng, exportFixedEpub, exportPdf, saveProjectJson } from './exporters';
import type { BookPage, BookProject, DesignElement, PageKind } from './types';
import { getPageSize, MM_TO_PX, uid } from './types';

const STORAGE_KEY = 'makebook1.project.v1';
const FONT_CHOICES = [
  'Pretendard, "Noto Sans KR", Arial, sans-serif',
  '"Noto Sans KR", Arial, sans-serif',
  '"Noto Serif KR", "Nanum Myeongjo", serif',
  '"Nanum Myeongjo", serif',
  '"Nanum Gothic", sans-serif',
  'Arial, sans-serif',
  'Georgia, serif'
];

const PAGE_LABELS: Record<PageKind, string> = {
  cover: '겉표지+세네카', front: '앞표지 단면', 'half-title': '반표제', title: '속표지', copyright: '속표지 뒷장', content: '본문', chapter: '장/주차 시작', track: 'TRACK', back: '뒷표지 단면'
};

function clone<T>(value: T): T { return structuredClone(value); }
function n(v: string | number | undefined, fallback = 0) { const x = Number(v); return Number.isFinite(x) ? x : fallback; }

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file);
  });
}

function loadInitialProject(): BookProject {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as BookProject;
  } catch { /* ignore damaged local save */ }
  return createDefaultProject();
}

interface PageCanvasProps {
  page: BookPage;
  project: BookProject;
  selectedId?: string | null;
  zoom?: number;
  readOnly?: boolean;
  snap?: boolean;
  showGuides?: boolean;
  showGrid?: boolean;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<DesignElement>) => void;
}

function CoverGuides({ project }: { project: BookProject }) {
  const { trimWidthMm: tw, trimHeightMm: th, bleedMm: b, spineMm: s, safeMm } = project.settings;
  const x1 = b; const x2 = b + tw; const x3 = x2 + s; const x4 = x3 + tw;
  return <div className="cover-guides" aria-hidden="true">
    {[x1, x2, x3, x4].map((x, i) => <div key={i} className="guide-v" style={{ left: x * MM_TO_PX }} />)}
    <div className="guide-h" style={{ top: b * MM_TO_PX }} />
    <div className="guide-h" style={{ top: (b + th) * MM_TO_PX }} />
    <div className="cover-label" style={{ left: (b + tw / 2) * MM_TO_PX }}>뒷표지</div>
    <div className="cover-label spine-label" style={{ left: (b + tw + s / 2) * MM_TO_PX }}>책등</div>
    <div className="cover-label" style={{ left: (b + tw + s + tw / 2) * MM_TO_PX }}>앞표지</div>
    <div className="safe-box" style={{ left: (b + safeMm) * MM_TO_PX, top: (b + safeMm) * MM_TO_PX, width: (tw - safeMm * 2) * MM_TO_PX, height: (th - safeMm * 2) * MM_TO_PX }} />
    <div className="safe-box" style={{ left: (b + tw + s + safeMm) * MM_TO_PX, top: (b + safeMm) * MM_TO_PX, width: (tw - safeMm * 2) * MM_TO_PX, height: (th - safeMm * 2) * MM_TO_PX }} />
  </div>;
}

function ElementVisual({ element }: { element: DesignElement }) {
  const common: React.CSSProperties = {
    width: '100%', height: '100%', boxSizing: 'border-box', opacity: element.style.opacity ?? 1,
    transform: `rotate(${element.rotation || 0}deg)`, transformOrigin: 'center center',
    mixBlendMode: (element.style.mixBlendMode as React.CSSProperties['mixBlendMode']) || 'normal'
  };
  if (element.kind === 'image') {
    return element.src ? <img draggable={false} src={element.src} alt={element.alt || ''} style={{ ...common, objectFit: element.style.objectFit || 'cover', display: 'block' }} />
      : <div className="image-placeholder" style={common}>IMAGE</div>;
  }
  if (element.kind === 'shape') {
    return <div style={{ ...common, borderRadius: element.shape === 'ellipse' ? '50%' : `${(element.style.borderRadiusMm || 0) * MM_TO_PX}px`, background: element.style.fill || 'transparent', border: `${(element.style.strokeWidthMm || 0) * MM_TO_PX}px solid ${element.style.stroke || 'transparent'}` }} />;
  }
  if (element.kind === 'line') {
    return <div style={{ ...common, height: 0, marginTop: '50%', borderTop: `${Math.max((element.style.strokeWidthMm || 0.3) * MM_TO_PX, 1)}px solid ${element.style.stroke || '#333'}` }} />;
  }
  return <div style={{ ...common, padding: element.style.fill && element.style.fill !== 'transparent' ? '6px 8px' : 0, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word', fontFamily: element.style.fontFamily, fontSize: `${element.style.fontSizePt || 11}pt`, fontWeight: element.style.fontWeight || 400, lineHeight: element.style.lineHeight || 1.45, letterSpacing: `${element.style.letterSpacingEm || 0}em`, color: element.style.color || '#222', textAlign: element.style.textAlign || 'left', background: element.style.fill || 'transparent', border: `${(element.style.strokeWidthMm || 0) * MM_TO_PX}px solid ${element.style.stroke || 'transparent'}`, borderRadius: `${(element.style.borderRadiusMm || 0) * MM_TO_PX}px` }}>{element.content}</div>;
}

function PageCanvas({ page, project, selectedId, zoom = 1, readOnly, snap, showGuides = true, showGrid, onSelect, onChange }: PageCanvasProps) {
  const size = getPageSize(page, project.settings);
  const grid = Math.max(project.settings.snapMm * MM_TO_PX, 1);
  const ordered = [...page.elements].sort((a, b) => a.z - b.z);
  return <div
    className={`design-board ${showGrid ? 'with-grid' : ''}`}
    data-export-page={page.id}
    style={{ width: size.widthMm * MM_TO_PX, height: size.heightMm * MM_TO_PX, background: page.background, '--grid-px': `${grid}px` } as React.CSSProperties}
    onMouseDown={e => { if (e.currentTarget === e.target) onSelect?.(null); }}
  >
    {ordered.map(el => {
      if (el.hidden) return null;
      const box = {
        x: el.x * MM_TO_PX, y: el.y * MM_TO_PX,
        width: Math.max(el.w * MM_TO_PX, 2), height: Math.max(el.h * MM_TO_PX, 2)
      };
      if (readOnly) return <div key={el.id} className="readonly-el" style={{ position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height, zIndex: el.z }}><ElementVisual element={el} /></div>;
      return <Rnd key={el.id}
        bounds="parent" scale={zoom} disableDragging={!!el.locked}
        enableResizing={!el.locked}
        dragGrid={snap ? [grid, grid] : undefined} resizeGrid={snap ? [grid, grid] : undefined}
        position={{ x: box.x, y: box.y }} size={{ width: box.width, height: box.height }}
        style={{ zIndex: el.z }} className={`canvas-el ${selectedId === el.id ? 'selected' : ''} ${el.locked ? 'locked' : ''}`}
        onMouseDown={e => { e.stopPropagation(); onSelect?.(el.id); }}
        onDragStop={(_, d) => onChange?.(el.id, { x: d.x / MM_TO_PX, y: d.y / MM_TO_PX })}
        onResizeStop={(_, __, ref, ___, pos) => onChange?.(el.id, { x: pos.x / MM_TO_PX, y: pos.y / MM_TO_PX, w: ref.offsetWidth / MM_TO_PX, h: ref.offsetHeight / MM_TO_PX })}
      ><ElementVisual element={el} /></Rnd>;
    })}
    {showGuides && page.kind === 'cover' && <CoverGuides project={project} />}
    {showGuides && page.kind !== 'cover' && <div className="safe-box" style={{ left: project.settings.safeMm * MM_TO_PX, top: project.settings.safeMm * MM_TO_PX, width: (size.widthMm - project.settings.safeMm * 2) * MM_TO_PX, height: (size.heightMm - project.settings.safeMm * 2) * MM_TO_PX }} />}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function NumberField({ label, value, step = 1, min, onChange }: { label: string; value: number; step?: number; min?: number; onChange: (v: number) => void }) {
  return <Field label={label}><input type="number" value={Number.isFinite(value) ? value : 0} min={min} step={step} onChange={e => onChange(n(e.target.value))} /></Field>;
}

function App() {
  const [project, setProject] = useState<BookProject>(() => loadInitialProject());
  const [pageId, setPageId] = useState(project.pages[0]?.id || '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [snap, setSnap] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [busy, setBusy] = useState('');
  const [history, setHistory] = useState<{ past: BookProject[]; future: BookProject[] }>({ past: [], future: [] });
  const [clipboard, setClipboard] = useState<DesignElement | null>(null);
  const [printPageId, setPrintPageId] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const exportStage = useRef<HTMLDivElement>(null);
  const currentBoardWrap = useRef<HTMLDivElement>(null);

  const currentPage = project.pages.find(p => p.id === pageId) || project.pages[0];
  const currentPageIndex = project.pages.findIndex(p => p.id === currentPage?.id);
  const selected = currentPage?.elements.find(e => e.id === selectedId) || null;
  const pageSize = currentPage ? getPageSize(currentPage, project.settings) : { widthMm: 152, heightMm: 225 };

  const commit = useCallback((next: BookProject, record = true) => {
    next.updatedAt = new Date().toISOString();
    if (record) setHistory(h => ({ past: [...h.past.slice(-49), clone(project)], future: [] }));
    setProject(next);
  }, [project]);

  const mutate = useCallback((fn: (draft: BookProject) => void, record = true) => {
    const next = clone(project); fn(next); commit(next, record);
  }, [project, commit]);

  const undo = useCallback(() => {
    setHistory(h => {
      const prev = h.past[h.past.length - 1];
      if (!prev) return h;
      setProject(prev);
      return { past: h.past.slice(0, -1), future: [clone(project), ...h.future.slice(0, 49)] };
    });
  }, [project]);

  const redo = useCallback(() => {
    setHistory(h => {
      const next = h.future[0]; if (!next) return h;
      setProject(next);
      return { past: [...h.past, clone(project)], future: h.future.slice(1) };
    });
  }, [project]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); }, [project]);
  useEffect(() => {
    project.fonts.forEach(font => {
      if ([...document.fonts].some(f => f.family === font.name)) return;
      const face = new FontFace(font.name, `url(${font.dataUrl})`);
      face.load().then(f => document.fonts.add(f)).catch(() => undefined);
    });
  }, [project.fonts]);

  const patchElement = (id: string, patch: Partial<DesignElement>) => mutate(d => {
    const p = d.pages.find(x => x.id === pageId); const el = p?.elements.find(x => x.id === id); if (el) Object.assign(el, patch);
  });
  const patchStyle = (patch: Partial<DesignElement['style']>) => { if (!selected) return; mutate(d => {
    const el = d.pages.find(x => x.id === pageId)?.elements.find(x => x.id === selected.id); if (el) el.style = { ...el.style, ...patch };
  }); };

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    mutate(d => { const p = d.pages.find(x => x.id === pageId); if (p) p.elements = p.elements.filter(e => e.id !== selectedId); });
    setSelectedId(null);
  }, [selectedId, mutate, pageId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy = clone(selected); copy.id = uid(copy.kind); copy.name += ' 복사'; copy.x += 3; copy.y += 3; copy.z += 1;
    mutate(d => { d.pages.find(x => x.id === pageId)?.elements.push(copy); }); setSelectedId(copy.id);
  }, [selected, mutate, pageId]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
      if (mod && e.key.toLowerCase() === 'c' && selected) { e.preventDefault(); setClipboard(clone(selected)); return; }
      if (mod && e.key.toLowerCase() === 'v' && clipboard) { e.preventDefault(); const copy = clone(clipboard); copy.id = uid(copy.kind); copy.x += 4; copy.y += 4; mutate(d => d.pages.find(x => x.id === pageId)?.elements.push(copy)); setSelectedId(copy.id); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); deleteSelected(); return; }
      if (selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault(); const step = e.shiftKey ? 5 : (snap ? project.settings.snapMm : 0.2);
        const patch: Partial<DesignElement> = {};
        if (e.key === 'ArrowLeft') patch.x = selected.x - step; if (e.key === 'ArrowRight') patch.x = selected.x + step;
        if (e.key === 'ArrowUp') patch.y = selected.y - step; if (e.key === 'ArrowDown') patch.y = selected.y + step;
        patchElement(selected.id, patch);
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [undo, redo, duplicateSelected, selected, clipboard, deleteSelected, selectedId, snap, project.settings.snapMm, patchElement, pageId, mutate]);

  const addText = () => {
    const el: DesignElement = { id: uid('txt'), kind: 'text', name: '텍스트', x: 20, y: 20, w: Math.min(pageSize.widthMm - 40, 90), h: 24, rotation: 0, z: 20, content: '텍스트를 입력하세요', style: { fontFamily: FONT_CHOICES[0], fontSizePt: 16, fontWeight: 600, lineHeight: 1.4, letterSpacingEm: -0.02, color: '#242824', textAlign: 'left', opacity: 1 } };
    mutate(d => d.pages.find(x => x.id === pageId)?.elements.push(el)); setSelectedId(el.id);
  };
  const addShape = (shape: 'rect' | 'ellipse' = 'rect') => {
    const el: DesignElement = { id: uid('shape'), kind: 'shape', shape, name: shape === 'rect' ? '사각형' : '원', x: 20, y: 20, w: 45, h: 30, rotation: 0, z: 5, style: { fill: '#dfe8e1', stroke: '#607168', strokeWidthMm: 0, opacity: 1, borderRadiusMm: shape === 'rect' ? 3 : 0 } };
    mutate(d => d.pages.find(x => x.id === pageId)?.elements.push(el)); setSelectedId(el.id);
  };
  const addLine = () => {
    const el: DesignElement = { id: uid('line'), kind: 'line', name: '선', x: 20, y: 50, w: 70, h: 2, rotation: 0, z: 6, style: { stroke: '#5e6d64', strokeWidthMm: 0.4, opacity: 1 } };
    mutate(d => d.pages.find(x => x.id === pageId)?.elements.push(el)); setSelectedId(el.id);
  };

  const addImageFile = async (file: File, background = false) => {
    const src = await readAsDataUrl(file);
    const size = getPageSize(currentPage, project.settings);
    const el: DesignElement = { id: uid('img'), kind: 'image', name: background ? `배경 · ${file.name}` : file.name, x: background ? 0 : 20, y: background ? 0 : 20, w: background ? size.widthMm : Math.min(90, size.widthMm - 40), h: background ? size.heightMm : 80, rotation: 0, z: background ? -100 : 8, locked: background, src, alt: file.name, style: { objectFit: background ? 'cover' : 'contain', opacity: 1 } };
    mutate(d => d.pages.find(x => x.id === pageId)?.elements.push(el)); if (!background) setSelectedId(el.id);
  };

  const addPage = (kind: PageKind) => {
    const p = pageFromTemplate(kind, project); mutate(d => d.pages.push(p)); setPageId(p.id); setSelectedId(null);
  };
  const duplicatePage = () => {
    const p = clone(currentPage); p.id = uid('page'); p.name += ' 복사'; p.elements.forEach(e => e.id = uid(e.kind));
    mutate(d => d.pages.splice(currentPageIndex + 1, 0, p)); setPageId(p.id); setSelectedId(null);
  };
  const deletePage = () => {
    if (project.pages.length <= 1) return;
    const nextId = project.pages[Math.max(0, currentPageIndex - 1)].id;
    mutate(d => d.pages = d.pages.filter(p => p.id !== pageId)); setPageId(nextId); setSelectedId(null);
  };
  const movePage = (dir: -1 | 1) => {
    const target = currentPageIndex + dir; if (target < 0 || target >= project.pages.length) return;
    mutate(d => { const [p] = d.pages.splice(currentPageIndex, 1); d.pages.splice(target, 0, p); });
  };

  const layerMove = (delta: number) => { if (!selected) return; patchElement(selected.id, { z: selected.z + delta }); };
  const align = (where: string) => { if (!selected) return; const size = getPageSize(currentPage, project.settings); const patch: Partial<DesignElement> = {};
    if (where === 'left') patch.x = 0; if (where === 'center') patch.x = (size.widthMm - selected.w) / 2; if (where === 'right') patch.x = size.widthMm - selected.w;
    if (where === 'top') patch.y = 0; if (where === 'middle') patch.y = (size.heightMm - selected.h) / 2; if (where === 'bottom') patch.y = size.heightMm - selected.h;
    patchElement(selected.id, patch);
  };

  const exportNodes = () => exportStage.current ? Array.from(exportStage.current.querySelectorAll<HTMLElement>('.design-board')) : [];
  const doPdf = async () => { setBusy('PDF 렌더링 중…'); try { await exportPdf(project, exportNodes()); } finally { setBusy(''); } };
  const doEpub = async () => { setBusy('EPUB3 렌더링 중…'); try { await exportFixedEpub(project, exportNodes()); } finally { setBusy(''); } };
  const doPng = async () => { const node = currentBoardWrap.current?.querySelector<HTMLElement>('.design-board'); if (!node) return; setBusy('PNG 렌더링 중…'); try { await exportCurrentPng(node, `${currentPage.name}.png`, project.settings.dpi); } finally { setBusy(''); } };

  const printCurrent = () => {
    setPrintPageId(pageId);
    const style = document.createElement('style'); style.id = 'dynamic-page-size';
    style.textContent = `@page { size: ${pageSize.widthMm}mm ${pageSize.heightMm}mm; margin: 0; }`;
    document.getElementById('dynamic-page-size')?.remove(); document.head.appendChild(style);
    setTimeout(() => window.print(), 120);
  };

  const importProject = async (file: File) => {
    try { const data = JSON.parse(await file.text()) as BookProject; setHistory({ past: [clone(project)], future: [] }); setProject(data); setPageId(data.pages[0]?.id || ''); setSelectedId(null); }
    catch { alert('MakeBook 프로젝트 JSON을 읽을 수 없습니다.'); }
  };
  const importFont = async (file: File) => {
    const dataUrl = await readAsDataUrl(file); const name = file.name.replace(/\.[^.]+$/, '');
    mutate(d => d.fonts.push({ id: uid('font'), name, dataUrl }));
  };

  const customFontNames = project.fonts.map(f => f.name);
  const allFonts = [...customFontNames, ...FONT_CHOICES];

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">M</span><div><b>MakeBook Studio</b><small>visual publishing workspace</small></div></div>
      <input className="project-title" value={project.title} onChange={e => mutate(d => { d.title = e.target.value; }, false)} aria-label="프로젝트 제목" />
      <div className="top-actions">
        <button onClick={undo} disabled={!history.past.length}>↶ 실행취소</button>
        <button onClick={redo} disabled={!history.future.length}>↷ 다시실행</button>
        <button onClick={() => saveProjectJson(project)}>프로젝트 저장</button>
        <button onClick={() => projectInput.current?.click()}>불러오기</button>
        <button className="primary" onClick={doPdf}>PDF</button>
        <button className="primary" onClick={doEpub}>EPUB3</button>
      </div>
    </header>

    <aside className="leftbar">
      <div className="panel-head"><b>페이지</b><span>{project.pages.length}</span></div>
      <div className="page-list">
        {project.pages.map((p, i) => <button key={p.id} className={`page-row ${p.id === pageId ? 'active' : ''}`} onClick={() => { setPageId(p.id); setSelectedId(null); }}>
          <span className={`page-thumb kind-${p.kind}`}>{i + 1}</span><span className="page-meta"><b>{p.name}</b><small>{PAGE_LABELS[p.kind]}</small></span>
        </button>)}
      </div>
      <div className="page-create">
        <select defaultValue="track" id="new-page-kind">{Object.entries(PAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button onClick={() => addPage((document.getElementById('new-page-kind') as HTMLSelectElement).value as PageKind)}>+ 페이지</button>
      </div>
      <div className="mini-actions"><button onClick={duplicatePage}>복제</button><button onClick={() => movePage(-1)}>↑</button><button onClick={() => movePage(1)}>↓</button><button onClick={deletePage}>삭제</button></div>
    </aside>

    <main className="workspace">
      <div className="canvas-toolbar">
        <div className="tool-group"><button onClick={addText}>T 텍스트</button><button onClick={() => imageInput.current?.click()}>▧ 이미지</button><button onClick={() => bgInput.current?.click()}>▣ 배경</button><button onClick={() => addShape('rect')}>□ 사각형</button><button onClick={() => addShape('ellipse')}>○ 원</button><button onClick={addLine}>─ 선</button></div>
        <div className="tool-group"><label className="toggle"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />스냅</label><label className="toggle"><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />그리드</label><label className="toggle"><input type="checkbox" checked={showGuides} onChange={e => setShowGuides(e.target.checked)} />가이드</label></div>
        <div className="zoom"><button onClick={() => setZoom(z => Math.max(.25, z - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(z => Math.min(1.6, z + .1))}>＋</button></div>
      </div>
      <div className="canvas-scroll">
        <div className="board-label"><b>{currentPage.name}</b><span>{pageSize.widthMm.toFixed(1)} × {pageSize.heightMm.toFixed(1)} mm</span></div>
        <div ref={currentBoardWrap} className="board-zoom-wrap" style={{ width: pageSize.widthMm * MM_TO_PX * zoom, height: pageSize.heightMm * MM_TO_PX * zoom }}>
          <div className="board-zoom" style={{ transform: `scale(${zoom})` }}><PageCanvas page={currentPage} project={project} selectedId={selectedId} zoom={zoom} snap={snap} showGuides={showGuides} showGrid={showGrid} onSelect={setSelectedId} onChange={patchElement} /></div>
        </div>
      </div>
      <div className="bottom-actions"><button onClick={doPng}>현재 페이지 PNG</button><button onClick={printCurrent}>현재 페이지 벡터 인쇄/PDF</button><span>Delete 삭제 · Ctrl/Cmd+D 복제 · 방향키 이동 · Shift+방향키 5mm</span></div>
    </main>

    <aside className="rightbar">
      {selected ? <>
        <div className="panel-head"><b>요소 속성</b><span>{selected.kind}</span></div>
        <Field label="레이어 이름"><input value={selected.name} onChange={e => patchElement(selected.id, { name: e.target.value })} /></Field>
        {selected.kind === 'text' && <>
          <Field label="텍스트"><textarea rows={6} value={selected.content || ''} onChange={e => patchElement(selected.id, { content: e.target.value })} /></Field>
          <Field label="글꼴"><select value={selected.style.fontFamily || ''} onChange={e => patchStyle({ fontFamily: e.target.value })}>{allFonts.map(f => <option key={f} value={f}>{f.split(',')[0].replaceAll('"', '')}</option>)}</select></Field>
          <button className="wide" onClick={() => fontInput.current?.click()}>+ 내 폰트 불러오기</button>
          <div className="grid-2"><NumberField label="크기 pt" value={selected.style.fontSizePt || 11} step={.5} min={4} onChange={v => patchStyle({ fontSizePt: v })} /><NumberField label="굵기" value={selected.style.fontWeight || 400} step={100} min={100} onChange={v => patchStyle({ fontWeight: v })} /><NumberField label="행간" value={selected.style.lineHeight || 1.4} step={.05} min={.6} onChange={v => patchStyle({ lineHeight: v })} /><NumberField label="자간 em" value={selected.style.letterSpacingEm || 0} step={.01} onChange={v => patchStyle({ letterSpacingEm: v })} /></div>
          <Field label="정렬"><div className="seg"><button className={selected.style.textAlign === 'left' ? 'on' : ''} onClick={() => patchStyle({ textAlign: 'left' })}>좌</button><button className={selected.style.textAlign === 'center' ? 'on' : ''} onClick={() => patchStyle({ textAlign: 'center' })}>중</button><button className={selected.style.textAlign === 'right' ? 'on' : ''} onClick={() => patchStyle({ textAlign: 'right' })}>우</button><button className={selected.style.textAlign === 'justify' ? 'on' : ''} onClick={() => patchStyle({ textAlign: 'justify' })}>양쪽</button></div></Field>
          <Field label="글자색"><input type="color" value={selected.style.color || '#222222'} onChange={e => patchStyle({ color: e.target.value })} /></Field>
        </>}
        {selected.kind === 'image' && <><Field label="이미지 맞춤"><select value={selected.style.objectFit || 'cover'} onChange={e => patchStyle({ objectFit: e.target.value as 'cover' | 'contain' | 'fill' })}><option value="cover">채우기/크롭</option><option value="contain">전체 보기</option><option value="fill">늘이기</option></select></Field><Field label="대체텍스트"><input value={selected.alt || ''} onChange={e => patchElement(selected.id, { alt: e.target.value })} /></Field></>}
        {(selected.kind === 'shape' || selected.kind === 'text') && <><Field label="배경/채움"><div className="color-row"><input type="color" value={selected.style.fill && selected.style.fill !== 'transparent' ? selected.style.fill : '#ffffff'} onChange={e => patchStyle({ fill: e.target.value })} /><button onClick={() => patchStyle({ fill: 'transparent' })}>투명</button></div></Field><div className="grid-2"><NumberField label="모서리 mm" value={selected.style.borderRadiusMm || 0} step={.5} min={0} onChange={v => patchStyle({ borderRadiusMm: v })} /><NumberField label="테두리 mm" value={selected.style.strokeWidthMm || 0} step={.1} min={0} onChange={v => patchStyle({ strokeWidthMm: v })} /></div><Field label="테두리색"><input type="color" value={selected.style.stroke && selected.style.stroke !== 'transparent' ? selected.style.stroke : '#000000'} onChange={e => patchStyle({ stroke: e.target.value })} /></Field></>}
        {selected.kind === 'line' && <><Field label="선 색"><input type="color" value={selected.style.stroke || '#333333'} onChange={e => patchStyle({ stroke: e.target.value })} /></Field><NumberField label="선 굵기 mm" value={selected.style.strokeWidthMm || .3} step={.1} min={.1} onChange={v => patchStyle({ strokeWidthMm: v })} /></>}
        <div className="grid-2"><NumberField label="X mm" value={selected.x} step={.5} onChange={v => patchElement(selected.id, { x: v })} /><NumberField label="Y mm" value={selected.y} step={.5} onChange={v => patchElement(selected.id, { y: v })} /><NumberField label="W mm" value={selected.w} step={.5} min={1} onChange={v => patchElement(selected.id, { w: v })} /><NumberField label="H mm" value={selected.h} step={.5} min={1} onChange={v => patchElement(selected.id, { h: v })} /><NumberField label="회전 °" value={selected.rotation} step={1} onChange={v => patchElement(selected.id, { rotation: v })} /><NumberField label="투명도" value={selected.style.opacity ?? 1} step={.05} min={0} onChange={v => patchStyle({ opacity: Math.min(1, Math.max(0, v)) })} /></div>
        <Field label="혼합 모드"><select value={selected.style.mixBlendMode || 'normal'} onChange={e => patchStyle({ mixBlendMode: e.target.value })}><option>normal</option><option>multiply</option><option>screen</option><option>overlay</option><option>darken</option><option>lighten</option></select></Field>
        <div className="section-title">정렬</div><div className="seg wrap"><button onClick={() => align('left')}>왼쪽</button><button onClick={() => align('center')}>가로중앙</button><button onClick={() => align('right')}>오른쪽</button><button onClick={() => align('top')}>위</button><button onClick={() => align('middle')}>세로중앙</button><button onClick={() => align('bottom')}>아래</button></div>
        <div className="section-title">레이어</div><div className="seg wrap"><button onClick={() => layerMove(1)}>앞으로</button><button onClick={() => layerMove(-1)}>뒤로</button><button onClick={() => patchElement(selected.id, { locked: !selected.locked })}>{selected.locked ? '잠금해제' : '잠금'}</button><button onClick={() => patchElement(selected.id, { hidden: !selected.hidden })}>{selected.hidden ? '보이기' : '숨기기'}</button><button onClick={duplicateSelected}>복제</button><button className="danger" onClick={deleteSelected}>삭제</button></div>
      </> : <>
        <div className="panel-head"><b>페이지 / 책 설정</b><span>{PAGE_LABELS[currentPage.kind]}</span></div>
        <Field label="페이지 이름"><input value={currentPage.name} onChange={e => mutate(d => { const p = d.pages.find(x => x.id === pageId); if (p) p.name = e.target.value; })} /></Field>
        <Field label="페이지 배경"><input type="color" value={currentPage.background} onChange={e => mutate(d => { const p = d.pages.find(x => x.id === pageId); if (p) p.background = e.target.value; })} /></Field>
        <div className="section-title">신국판 / 인쇄 규격</div>
        <div className="grid-2"><NumberField label="가로 mm" value={project.settings.trimWidthMm} step={1} min={40} onChange={v => mutate(d => d.settings.trimWidthMm = v)} /><NumberField label="세로 mm" value={project.settings.trimHeightMm} step={1} min={40} onChange={v => mutate(d => d.settings.trimHeightMm = v)} /><NumberField label="도련 mm" value={project.settings.bleedMm} step={.5} min={0} onChange={v => mutate(d => d.settings.bleedMm = v)} /><NumberField label="안전여백 mm" value={project.settings.safeMm} step={1} min={0} onChange={v => mutate(d => d.settings.safeMm = v)} /><NumberField label="세네카 mm" value={project.settings.spineMm} step={.5} min={1} onChange={v => mutate(d => d.settings.spineMm = v)} /><NumberField label="출력 DPI" value={project.settings.dpi} step={50} min={96} onChange={v => mutate(d => d.settings.dpi = v)} /><NumberField label="스냅 mm" value={project.settings.snapMm} step={.5} min={.1} onChange={v => mutate(d => d.settings.snapMm = v)} /></div>
        <div className="section-title">프로젝트 메타데이터</div>
        <Field label="저자"><input value={project.author} onChange={e => mutate(d => d.author = e.target.value, false)} /></Field>
        <Field label="언어"><input value={project.language} onChange={e => mutate(d => d.language = e.target.value, false)} /></Field>
        <Field label="EPUB 식별자"><input value={project.identifier} onChange={e => mutate(d => d.identifier = e.target.value, false)} /></Field>
        <div className="hint-card"><b>이미지 위 조판</b><p>배경 또는 이미지를 업로드한 뒤 텍스트를 추가하세요. 각 요소는 독립 레이어라 위치·크기·회전·투명도·혼합 모드와 앞뒤 순서를 자유롭게 수정할 수 있습니다.</p></div>
      </>}
      <div className="section-title">레이어 목록</div>
      <div className="layers">{[...currentPage.elements].sort((a, b) => b.z - a.z).map(el => <button key={el.id} className={el.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(el.id)}><span>{el.locked ? '🔒' : el.hidden ? '◌' : '◆'}</span><b>{el.name}</b><small>z {el.z}</small></button>)}</div>
    </aside>

    <input ref={imageInput} hidden type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) void addImageFile(f); e.currentTarget.value = ''; }} />
    <input ref={bgInput} hidden type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) void addImageFile(f, true); e.currentTarget.value = ''; }} />
    <input ref={fontInput} hidden type="file" accept=".ttf,.otf,.woff,.woff2,font/*" onChange={e => { const f = e.target.files?.[0]; if (f) void importFont(f); e.currentTarget.value = ''; }} />
    <input ref={projectInput} hidden type="file" accept="application/json,.json" onChange={e => { const f = e.target.files?.[0]; if (f) void importProject(f); e.currentTarget.value = ''; }} />

    <div ref={exportStage} className="export-stage" aria-hidden="true">{project.pages.map(p => <PageCanvas key={p.id} page={p} project={project} readOnly showGuides={false} showGrid={false} />)}</div>
    <div className="print-stage">{printPageId && <PageCanvas page={project.pages.find(p => p.id === printPageId) || currentPage} project={project} readOnly showGuides={false} showGrid={false} />}</div>
    {busy && <div className="busy"><div className="spinner" /><b>{busy}</b><span>고해상도 출력은 잠시 걸릴 수 있습니다.</span></div>}
  </div>;
}

export default App;
