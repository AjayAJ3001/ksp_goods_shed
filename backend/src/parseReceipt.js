import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).href;

const HEADER_LINE = /^RR\s*No\s*[:.]?\s*(\S+)\s+RR\s*Date\s*[:.]?\s*(\d{2}[-/.]\d{2}[-/.]\d{4})\s+FNR(?:\s*No)?\s*[:.]?\s*(\S+)\s+Station\s*From\s*[:.]?\s*(.+?)\s+Station\s*To\s*[:.]?\s*(.+)$/i;

export function matchHeaderLine(line) {
  const raw = String(line || '');
  if (/[\r\n]/.test(raw)) return null;
  const header = raw.replace(/[^\S\n]+/g, ' ').trim().match(HEADER_LINE);
  if (!header) return null;
  return {
    rrNo: header[1],
    rrDate: header[2].replace(/[/.]/g, '-'),
    fnr: header[3],
    stationFrom: header[4].trim(),
    stationTo: header[5].trim(),
    line: header[0].replace(/\s+/g, ' ').trim(),
  };
}

function linesFrom(items) {
  const rows = [];
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  for (const item of sorted) {
    const row = rows.find((entry) => entry.page === item.page && Math.abs(entry.y - item.y) <= 3);
    if (row) {
      row.items.push(item);
    } else {
      rows.push({ page: item.page, y: item.y, items: [item] });
    }
  }
  return rows.map((row) =>
    row.items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function wagonNumberX(items, page) {
  const number = items.find(
    (item) =>
      item.page === page &&
      item.str === 'Number' &&
      items.some(
        (wagon) =>
          wagon.page === page &&
          wagon.str === 'Wagon' &&
          wagon.y > item.y &&
          wagon.y - item.y < 14 &&
          wagon.x < item.x &&
          item.x - wagon.x < 40
      )
  );
  return number ? number.x : 127;
}

function wagonColumns(items, page) {
  const article = items.find((item) => item.page === page && item.str === 'Article');
  const type = items.find((item) => item.page === page && item.str === 'Type' && (!article || item.x < article.x));
  const rly = items.find((item) => item.page === page && item.str === 'Rly' && (!type || item.x < type.x));
  const serial = items.find((item) => item.page === page && item.str === 'No.' && (!rly || item.x < rly.x));
  const numberX = wagonNumberX(items, page);
  if (!article || !type || !rly || !serial) {
    return { serial0: 20, serial1: 46, own0: 46, own1: 78, type0: 78, type1: 126, art0: 198, art1: 232, numberX, headerY: null };
  }
  return {
    serial0: serial.x - 4,
    serial1: rly.x - 2,
    own0: rly.x - 4,
    own1: type.x - 2,
    type0: type.x - 6,
    type1: Math.max(type.x + 8, numberX - 4),
    art0: article.x - 6,
    art1: article.x + 18,
    numberX,
    headerY: Math.min(article.y, type.y, rly.y, serial.y),
  };
}

function extractWagons(items) {
  const pages = [...new Set(items.map((item) => item.page))];
  const columns = new Map(pages.map((page) => [page, wagonColumns(items, page)]));
  const serials = items.filter((item) => {
    const column = columns.get(item.page);
    return (
      /^\d{1,3}$/.test(item.str) &&
      item.x >= column.serial0 &&
      item.x < column.serial1 &&
      (column.headerY == null || item.y < column.headerY - 4)
    );
  });
  const wagons = [];
  const seen = new Set();

  for (const serial of serials) {
    const sno = Number(serial.str);
    if (seen.has(sno)) continue;
    const column = columns.get(serial.page);
    const row = items.filter((item) => item.page === serial.page && Math.abs(item.y - serial.y) < 2.5);
    const owning = row.find((item) => item.x >= column.own0 && item.x < column.own1 && /^[A-Z]{2,4}$/.test(item.str));
    const type = row.find((item) => item.x >= column.type0 && item.x < column.type1 && /^[A-Z][A-Z0-9]+$/.test(item.str));
    const articles = row.find((item) => item.x >= column.art0 && item.x < column.art1 && /^\d+$/.test(item.str));
    if (!owning || !type || !articles) continue;

    const numberParts = items
      .filter(
        (item) =>
          item.page === serial.page &&
          item.x >= column.numberX - 8 &&
          item.x < column.numberX + 34 &&
          item.y <= serial.y + 1.5 &&
          item.y >= serial.y - 12 &&
          /^\d+$/.test(item.str)
      )
      .sort((a, b) => b.y - a.y);
    const wagonNo = numberParts.map((item) => item.str).join('');
    if (wagonNo.length < 8) continue;

    seen.add(sno);
    wagons.push({
      sno,
      owningRly: owning.str,
      wagonType: type.str,
      wagonNo,
      articleCount: Number(articles.str),
      shedNo: '',
    });
  }

  wagons.sort((a, b) => a.sno - b.sno);
  return wagons;
}

export async function parseEtRr(buffer) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const items = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const item of content.items) {
      const str = String(item.str || '').replace(/\s+/g, ' ').trim();
      if (!str) continue;
      items.push({
        str,
        x: item.transform[4],
        y: item.transform[5],
        page: pageNumber,
      });
    }
  }

  const lines = linesFrom(items);
  const text = lines.join('\n');
  const phrase = /electronically\s+transmitted\s+railway\s+receipt|\(e\s*t\s*-\s*rr\)/i.test(text);
  let textError = null;
  if (phrase) {
    const header = lines.map(matchHeaderLine).find(Boolean);
    const commodityMatch = text.match(/Commodity Description\s*:\s*(.+)/i);
    const commodityDescription = commodityMatch ? commodityMatch[1].trim() : '';
    const codes = text.match(/Consignor Code\s*:\s*(\S+)\s+Consignee Code\s*:\s*(\S+)/i);
    const wagons = header && commodityDescription ? extractWagons(items) : [];
    if (header && commodityDescription && wagons.length) {
      return {
        rrNo: header.rrNo,
        rrDate: header.rrDate,
        fnr: header.fnr,
        stationFrom: header.stationFrom,
        stationTo: header.stationTo,
        commodityDescription,
        consignorCode: codes ? codes[1] : null,
        consigneeCode: codes ? codes[2] : null,
        rrLine: header.line,
        commodityLine: `Commodity Description: ${commodityDescription}`,
        wagons,
      };
    }
    textError = new Error(
      !header
        ? 'RR No, RR Date, FNR, Station From, and Station To must be together on one line in the eT-RR.'
        : !commodityDescription
          ? 'Could not read the commodity description from the eT-RR.'
          : 'Could not read wagon rows (S.no, owning railway, type, wagon no, articles) from the eT-RR.'
    );
    textError.status = 400;
  }

  const { parseOutlinedEtRr } = await import('./outlinedReceipt.js');
  const outlined = await parseOutlinedEtRr(buffer);
  if (outlined) return outlined;
  if (textError) throw textError;
  const error = new Error('This PDF does not contain an electronically Transmitted Railway Receipt (eT-RR).');
  error.status = 400;
  throw error;
}

export function toIsoDate(dmy) {
  const [day, month, year] = dmy.split('-');
  return `${year}-${month}-${day}`;
}
