export type PageKind = 'cover' | 'front' | 'half-title' | 'title' | 'copyright' | 'content' | 'chapter' | 'track' | 'back';
export type ElementKind = 'text' | 'image' | 'shape' | 'line';
export type ShapeKind = 'rect' | 'ellipse';

export interface BookSettings {
  trimWidthMm: number;
  trimHeightMm: number;
  bleedMm: number;
  safeMm: number;
  spineMm: number;
  dpi: number;
  snapMm: number;
}

export interface CustomFont {
  id: string;
  name: string;
  dataUrl: string;
}

export interface ElementStyle {
  fontFamily?: string;
  fontSizePt?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacingEm?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fill?: string;
  stroke?: string;
  strokeWidthMm?: number;
  opacity?: number;
  borderRadiusMm?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
  mixBlendMode?: string;
}

export interface DesignElement {
  id: string;
  kind: ElementKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
  locked?: boolean;
  hidden?: boolean;
  content?: string;
  src?: string;
  alt?: string;
  shape?: ShapeKind;
  style: ElementStyle;
}

export interface BookPage {
  id: string;
  kind: PageKind;
  name: string;
  background: string;
  elements: DesignElement[];
}

export interface BookProject {
  version: 1;
  title: string;
  author: string;
  language: string;
  identifier: string;
  settings: BookSettings;
  fonts: CustomFont[];
  pages: BookPage[];
  updatedAt: string;
}

export interface PageSize {
  widthMm: number;
  heightMm: number;
}

export const MM_TO_PX = 96 / 25.4;

export function getPageSize(page: BookPage, settings: BookSettings): PageSize {
  if (page.kind === 'cover') {
    return {
      widthMm: settings.bleedMm * 2 + settings.trimWidthMm * 2 + settings.spineMm,
      heightMm: settings.trimHeightMm + settings.bleedMm * 2
    };
  }
  return { widthMm: settings.trimWidthMm, heightMm: settings.trimHeightMm };
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
