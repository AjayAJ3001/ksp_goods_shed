import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import { matchHeaderLine } from './parseReceipt.js';

const require = createRequire(import.meta.url);
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).href;

const SCALE = 4;
const PHRASE = /electronically\s+transmitted\s+railway\s+receipt|\(e\s*t\s*-\s*rr\)/i;

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }

  reset(entry, width, height) {
    entry.canvas.width = width;
    entry.canvas.height = height;
  }

  destroy(entry) {
    entry.canvas.width = 0;
    entry.canvas.height = 0;
    entry.canvas = null;
    entry.context = null;
  }
}

let workersPromise;

function workers() {
  if (!workersPromise) {
    workersPromise = Promise.all([
      createWorker('eng'),
      createWorker('eng'),
    ]).then(async ([text, field]) => {
      await text.setParameters({ tessedit_pageseg_mode: '6' });
      await field.setParameters({ tessedit_pageseg_mode: '6' });
      return { text, field };
    }).catch((error) => {
      workersPromise = null;
      throw error;
    });
  }
  return workersPromise;
}

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function pixelsOf(canvas) {
  const { width, height } = canvas;
  return { width, height, data: canvas.getContext('2d').getImageData(0, 0, width, height).data };
}

function inkInRow(pixels, y, x0, x1) {
  const start = Math.max(0, x0);
  const end = Math.min(pixels.width, x1);
  let count = 0;
  let seen = 0;
  const row = y * pixels.width;
  for (let x = start; x < end; x += 2) {
    seen += 1;
    if (pixels.data[(row + x) * 4] < 128) count += 1;
  }
  return seen ? count / seen : 0;
}

function bandsFrom(flags, gap, minHeight = 1) {
  const bands = [];
  flags.forEach((on, y) => {
    if (!on) return;
    const last = bands.at(-1);
    if (last && y - last.end <= gap) last.end = y;
    else bands.push({ start: y, end: y });
  });
  return bands.filter((band) => band.end - band.start + 1 >= minHeight);
}

function tableOn(pixels) {
  const flags = new Array(pixels.height).fill(false);
  for (let y = 0; y < pixels.height; y += 1) {
    if (inkInRow(pixels, y, 30, pixels.width - 30) > 0.55) flags[y] = true;
  }
  const edges = bandsFrom(flags, 2).map((band) => band.start);
  let best = null;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const top = edges[index];
    const bottom = edges[index + 1];
    const span = bottom - top;
    if (span > SCALE * 120 && (!best || span > best.span)) best = { top, bottom, span };
  }
  return best;
}

function cropPng(canvas, x, y, width, height, scaleUp = 1) {
  const left = Math.max(0, Math.round(x));
  const top = Math.max(0, Math.round(y));
  const wide = Math.max(1, Math.min(canvas.width - left, Math.round(width)));
  const high = Math.max(1, Math.min(canvas.height - top, Math.round(height)));
  const out = createCanvas(wide * scaleUp, high * scaleUp);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, wide * scaleUp, high * scaleUp);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, left, top, wide, high, 0, 0, wide * scaleUp, high * scaleUp);
  return out.toBuffer('image/png');
}

function linesOf(text) {
  return String(text || '')
    .split(/\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function headerFrom(text) {
  const lines = linesOf(text);
  const candidates = [...lines];
  for (let index = 0; index < lines.length - 1; index += 1) {
    candidates.push(`${lines[index]} ${lines[index + 1]}`);
  }
  const header = candidates.map(matchHeaderLine).find(Boolean) || null;
  const commodityLine = candidates.find((line) => /commodity description\s*:/i.test(line)) || '';
  const commodityMatch = commodityLine.match(/Commodity Description\s*:\s*(.+)/i);
  const codesLine = candidates.find((line) => /consignor code:/i.test(line)) || text;
  const codes = String(codesLine).match(/Consignor Code:\s*(\S+)\s+Consignee Code:\s*(\S+)/i);
  return {
    header,
    commodityDescription: commodityMatch ? commodityMatch[1].trim() : '',
    consignorCode: codes ? codes[1] : null,
    consigneeCode: codes ? codes[2] : null,
  };
}

function wordsFromTsv(tsv, originX, originY) {
  return String(tsv || '').split('\n').slice(1).map((line) => {
    const parts = line.split('\t');
    if (parts[0] !== '5') return null;
    const text = parts.slice(11).join('\t').trim();
    if (!text) return null;
    const x0 = Number(parts[6]) + originX;
    return { text, x0, x1: x0 + Number(parts[8]), y0: Number(parts[7]) + originY };
  }).filter((word) => word && Number.isFinite(word.x0));
}

function wordText(word) {
  return word.text.replace(/[^A-Za-z]/g, '').toLowerCase();
}

function wordNamed(words, name) {
  const exact = words.find((word) => wordText(word) === name);
  if (exact || name.length < 4) return exact;
  return words.find((word) => {
    const text = wordText(word);
    if (text.length < name.length - 1 || text.length > name.length + 1) return false;
    let misses = 0;
    const length = Math.max(text.length, name.length);
    for (let index = 0; index < length; index += 1) {
      if (text[index] !== name[index]) misses += 1;
    }
    return misses <= 1;
  });
}

function serialBands(pixels, x0, x1, top, bottom) {
  const flags = [];
  for (let y = top; y < bottom; y += 1) flags[y] = inkInRow(pixels, y, x0, x1) > 0.02;
  const raw = bandsFrom(flags, 3, 3).filter((band) => band.end > top && band.start < bottom);
  const merged = [];
  for (const band of raw) {
    const last = merged.at(-1);
    if (last && band.start - last.end <= SCALE * 6) last.end = band.end;
    else merged.push({ start: band.start, end: band.end });
  }
  return merged;
}

function pairWagonNumbers(lines) {
  const parts = lines.map((line) => line.replace(/\D/g, '')).filter(Boolean);
  const numbers = [];
  for (let index = 0; index < parts.length;) {
    const current = parts[index];
    const next = parts[index + 1] || '';
    if (current.length >= 10) {
      numbers.push(current);
      index += 1;
    } else if (current.length >= 6 && next.length >= 2 && next.length <= 4 && current.length + next.length >= 10) {
      numbers.push(current + next);
      index += 2;
    } else {
      return null;
    }
  }
  return numbers;
}

async function readFields(buffer, whitelist) {
  const { field } = await workers();
  await field.setParameters({ tessedit_char_whitelist: whitelist });
  const result = await field.recognize(buffer);
  return linesOf(result.data.text);
}

async function refineTypes(types, bands, canvas, x, width) {
  if (types.length !== bands.length) return types;
  const counts = new Map();
  types.forEach((type) => counts.set(type, (counts.get(type) || 0) + 1));
  const trusted = new Set([...counts.entries()].filter(([, count]) => count >= 2).map(([type]) => type));
  if (![...counts.values()].some((count) => count === 1)) return types;
  const { field } = await workers();
  const refined = [...types];
  for (let index = 0; index < types.length; index += 1) {
    if (trusted.has(types[index])) continue;
    const band = bands[index];
    await field.setParameters({
      tessedit_pageseg_mode: '7',
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    });
    const read = await field.recognize(cropPng(canvas, x, band.start - 1, width, band.end - band.start + 4, 3));
    const line = linesOf(read.data.text).find((item) => trusted.has(item));
    if (line) refined[index] = line;
  }
  await field.setParameters({ tessedit_pageseg_mode: '6' });
  return refined;
}

async function wagonsFrom(canvas, pixels) {
  const table = tableOn(pixels);
  if (!table) return [];
  const headerLeft = 20;
  const headerTop = table.top - SCALE * 28;
  const headerPng = cropPng(canvas, headerLeft, headerTop, pixels.width - 40, SCALE * 26);
  const { text } = await workers();
  const headerRead = await text.recognize(headerPng, {}, { text: true, tsv: true });
  if (!/number/i.test(headerRead.data.text) || !/article/i.test(headerRead.data.text)) return [];
  const words = wordsFromTsv(headerRead.data.tsv, headerLeft, headerTop).sort((a, b) => a.x0 - b.x0);
  const serial = wordNamed(words, 'no');
  const owning = wordNamed(words, 'rly');
  const type = wordNamed(words, 'type');
  const number = wordNamed(words, 'number');
  const article = wordNamed(words, 'article');
  if (!serial || !owning || !type || !number || !article) return [];

  const nextAfter = (word) => words.find((item) => item.x0 > word.x1 + 4);
  const serialLeft = serial.x0 - 4;
  const serialRight = Math.min(owning.x0 - 4, serial.x0 + 42);
  const bands = serialBands(pixels, serialLeft, serialRight, table.top + 3, table.bottom - 2);
  if (bands.length < 5) return [];
  const gaps = bands.slice(1).map((band, index) => band.start - bands[index].start).sort((a, b) => a - b);
  const pitch = gaps[Math.floor(gaps.length / 2)] || SCALE * 16;
  const dataTop = bands[0].start - 2;
  const dataBottom = bands.at(-1).end + Math.round(pitch * 0.55);

  const column = (x, width, scaleUp = 1) => cropPng(canvas, x, dataTop, width, dataBottom - dataTop, scaleUp);
  const serials = (await readFields(column(serialLeft, serialRight - serialLeft), '0123456789'))
    .filter((line) => /^\d{1,3}$/.test(line))
    .map(Number);
  const count = serials.length;
  if (count < 5) return [];
  const railways = (await readFields(
    column(owning.x0 - 6, Math.max(12, type.x0 - owning.x0 - 4)),
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  )).filter((line) => /^[A-Z]{2,4}$/.test(line)).slice(0, count);
  const typeLeft = type.x0 - 8;
  const typeWidth = Math.max(20, number.x0 - type.x0 - 2);
  const types = await refineTypes(
    (await readFields(column(typeLeft, typeWidth), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'))
      .filter((line) => /^[A-Z][A-Z0-9]+$/.test(line))
      .slice(0, count),
    bands,
    canvas,
    typeLeft,
    typeWidth,
  );
  const articles = (await readFields(
    column(article.x0 - 8, Math.max(24, (nextAfter(article)?.x0 || article.x1 + 48) - article.x0 - 4)),
    '0123456789'
  )).filter((line) => /^\d{1,6}$/.test(line)).slice(0, count);
  const numberRight = Math.min((nextAfter(number)?.x0 || number.x1 + 80) - 12, number.x0 + SCALE * 34);
  const wagonNos = pairWagonNumbers(await readFields(
    column(number.x0 - 8, numberRight - (number.x0 - 8), 2),
    '0123456789'
  ));
  if (!wagonNos || railways.length < count || types.length < count || articles.length < count || wagonNos.length < count) {
    return [];
  }

  return serials.map((sno, index) => ({
    sno,
    owningRly: railways[index],
    wagonType: types[index],
    wagonNo: wagonNos[index],
    articleCount: Number(articles[index]),
    shedNo: '',
  })).filter((wagon) => wagon.wagonNo.length >= 10);
}

async function renderPages(buffer) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    CanvasFactory: NodeCanvasFactory,
    isOffscreenCanvasSupported: false,
  }).promise;
  const pages = [];
  const factory = new NodeCanvasFactory();
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: SCALE });
    const entry = factory.create(viewport.width, viewport.height);
    entry.context.fillStyle = '#ffffff';
    entry.context.fillRect(0, 0, viewport.width, viewport.height);
    await page.render({ canvasContext: entry.context, viewport }).promise;
    const image = entry.context.getImageData(0, 0, viewport.width, viewport.height);
    const { data } = image;
    for (let index = 0; index < data.length; index += 4) {
      const value = data[index] < 150 && data[index + 1] < 150 && data[index + 2] < 150 ? 0 : 255;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
    entry.context.putImageData(image, 0, 0);
    pages.push(entry.canvas);
  }
  await doc.destroy();
  return pages;
}

export async function parseOutlinedEtRr(buffer) {
  const pages = await renderPages(buffer);
  const { text } = await workers();
  let found = null;
  for (const canvas of pages) {
    const png = cropPng(canvas, 16, canvas.height * 0.012, canvas.width - 32, canvas.height * 0.1);
    const read = await text.recognize(png);
    if (!PHRASE.test(read.data.text)) continue;
    const parsed = headerFrom(read.data.text);
    if (parsed.header && parsed.commodityDescription) {
      found = parsed;
      break;
    }
  }
  if (!found) return null;

  const wagons = [];
  for (const canvas of pages) {
    const pageWagons = await wagonsFrom(canvas, pixelsOf(canvas));
    wagons.push(...pageWagons);
  }
  if (!wagons.length) {
    throw fail('Could not read wagon rows (S.no, owning railway, type, wagon no, articles) from the eT-RR.');
  }

  return {
    rrNo: found.header.rrNo,
    rrDate: found.header.rrDate,
    fnr: found.header.fnr,
    stationFrom: found.header.stationFrom,
    stationTo: found.header.stationTo,
    commodityDescription: found.commodityDescription,
    consignorCode: found.consignorCode,
    consigneeCode: found.consigneeCode,
    rrLine: found.header.line,
    commodityLine: `Commodity Description: ${found.commodityDescription}`,
    wagons,
  };
}
