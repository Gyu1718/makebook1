import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { BookPage, BookProject } from './types';
import { getPageSize } from './types';

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

function dataUrlBase64(dataUrl: string): string {
  return dataUrl.split(',')[1] ?? '';
}

export function saveProjectJson(project: BookProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `${project.title || 'book-project'}.makebook.json`);
}

export async function renderNode(node: HTMLElement, dpi: number) {
  const pixelRatio = Math.max(1, dpi / 96);
  return toPng(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: '#ffffff',
    style: { transform: 'none', transformOrigin: 'top left' }
  });
}

export async function exportCurrentPng(node: HTMLElement, filename: string, dpi: number) {
  const url = await renderNode(node, dpi);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export async function exportPdf(project: BookProject, nodes: HTMLElement[]) {
  if (!nodes.length) return;
  const firstSize = getPageSize(project.pages[0], project.settings);
  const firstOrientation = firstSize.widthMm > firstSize.heightMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation: firstOrientation, unit: 'mm', format: [firstSize.widthMm, firstSize.heightMm], compress: true });

  for (let i = 0; i < nodes.length; i++) {
    const page = project.pages[i];
    const size = getPageSize(page, project.settings);
    if (i > 0) pdf.addPage([size.widthMm, size.heightMm], size.widthMm > size.heightMm ? 'landscape' : 'portrait');
    const data = await renderNode(nodes[i], project.settings.dpi);
    pdf.addImage(data, 'PNG', 0, 0, size.widthMm, size.heightMm, undefined, 'FAST');
  }
  pdf.save(`${project.title || 'book'}-fixed-layout.pdf`);
}

function xmlEscape(s: string) {
  return s.replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] || ch));
}

export async function exportFixedEpub(project: BookProject, nodes: HTMLElement[]) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);

  const manifest: string[] = [];
  const spine: string[] = [];
  const nav: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const p: BookPage = project.pages[i];
    const size = getPageSize(p, project.settings);
    const png = await renderNode(nodes[i], Math.min(project.settings.dpi, 180));
    const imgName = `page-${String(i + 1).padStart(3, '0')}.png`;
    const xhtmlName = `page-${String(i + 1).padStart(3, '0')}.xhtml`;
    zip.file(`OEBPS/images/${imgName}`, dataUrlBase64(png), { base64: true });
    zip.file(`OEBPS/${xhtmlName}`, `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${xmlEscape(p.name)}</title><meta name="viewport" content="width=${Math.round(size.widthMm * 4)},height=${Math.round(size.heightMm * 4)}"/><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:white}img{width:100%;height:100%;object-fit:fill;display:block}</style></head><body><img src="images/${imgName}" alt="${xmlEscape(p.name)}"/></body></html>`);
    manifest.push(`<item id="img${i}" href="images/${imgName}" media-type="image/png"${i === 0 ? ' properties="cover-image"' : ''}/>`);
    manifest.push(`<item id="p${i}" href="${xhtmlName}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="p${i}"/>`);
    nav.push(`<li><a href="${xhtmlName}">${xmlEscape(p.name)}</a></li>`);
  }

  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>목차</title></head><body><nav epub:type="toc" id="toc"><h1>목차</h1><ol>${nav.join('')}</ol></nav></body></html>`);
  manifest.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');

  zip.file('OEBPS/package.opf', `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" prefix="rendition: http://www.idpf.org/vocab/rendition/#"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${xmlEscape(project.identifier)}</dc:identifier><dc:title>${xmlEscape(project.title)}</dc:title><dc:language>${xmlEscape(project.language)}</dc:language><dc:creator>${xmlEscape(project.author || '')}</dc:creator><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta><meta property="rendition:layout">pre-paginated</meta><meta property="rendition:orientation">auto</meta><meta property="rendition:spread">auto</meta></metadata><manifest>${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE', compressionOptions: { level: 7 } });
  downloadBlob(blob, `${project.title || 'book'}-fixed-layout.epub`);
}
