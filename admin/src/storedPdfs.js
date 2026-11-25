import { getToken } from './api';

export function dayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function pdfFileName(item) {
  const cleaned = String(item.fileName || `pdf-${item.id}.pdf`).replace(/[\\/:*?"<>|]+/g, '-').trim();
  const name = cleaned || `pdf-${item.id}.pdf`;
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
}

function uniqueName(name, used) {
  let next = name;
  let count = 2;
  while (used.has(next.toLowerCase())) {
    const dot = name.lastIndexOf('.');
    next = dot > 0 ? `${name.slice(0, dot)}-${count}${name.slice(dot)}` : `${name}-${count}`;
    count += 1;
  }
  used.add(next.toLowerCase());
  return next;
}

async function fetchPdf(path) {
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${getToken()}`, 'X-Client': 'admin' },
  });
  if (!response.ok) throw new Error('Could not open the stored PDF.');
  return response.blob();
}

export async function loadPdfs(items, filePath) {
  const used = new Set();
  const files = [];
  for (const item of items) {
    const blob = await fetchPdf(filePath(item));
    const name = uniqueName(pdfFileName(item), used);
    files.push({
      item,
      name,
      blob,
      url: URL.createObjectURL(blob),
      label: [item.rrNo, item.uploadedBy, item.fileName].filter(Boolean).join(' · '),
    });
  }
  return files;
}

export function releasePdfs(files) {
  for (const file of files) URL.revokeObjectURL(file.url);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.bytes;
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    locals.push(local, data);
    const header = new Uint8Array(46 + name.length);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x02014b50, true);
    headerView.setUint16(4, 20, true);
    headerView.setUint16(6, 20, true);
    headerView.setUint32(16, crc, true);
    headerView.setUint32(20, data.length, true);
    headerView.setUint32(24, data.length, true);
    headerView.setUint16(28, name.length, true);
    headerView.setUint32(42, offset, true);
    header.set(name, 46);
    central.push(header);
    offset += local.length + data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...locals, ...central, end], { type: 'application/zip' });
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadPdfs(files) {
  if (files.length === 1) {
    saveBlob(files[0].blob, files[0].name);
    return;
  }
  const packed = [];
  for (const file of files) packed.push({ name: file.name, bytes: new Uint8Array(await file.blob.arrayBuffer()) });
  saveBlob(zipStore(packed), 'uploaded-pdfs.zip');
}

export async function sharePdfs(files) {
  const shared = files.map((file) => new File([file.blob], file.name, { type: 'application/pdf' }));
  if (navigator.canShare?.({ files: shared })) {
    try {
      await navigator.share({ files: shared, title: 'Uploaded PDFs' });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await downloadPdfs(files);
}
