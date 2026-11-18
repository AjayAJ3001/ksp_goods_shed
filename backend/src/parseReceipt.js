import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).href;

function linesFrom(items) {
  const rows = [];
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  for (const item of sorted) {
    const row = rows.find((entry) => entry.page === item.page && Math.abs(entry.y - item.y) <= 2);
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

function extractWagons(items) {
  const serials = items.filter((item) => item.x >= 20 && item.x < 46 && /^\d{1,3}$/.test(item.str));
  const wagons = [];
  const seen = new Set();

  for (const serial of serials) {
    const sno = Number(serial.str);
    if (seen.has(sno)) continue;
    const row = items.filter((item) => item.page === serial.page && Math.abs(item.y - serial.y) < 2.5);
    const owning = row.find((item) => item.x >= 46 && item.x < 78 && /^[A-Z]{2,4}$/.test(item.str));
    const type = row.find((item) => item.x >= 78 && item.x < 126 && /^[A-Z][A-Z0-9]+$/.test(item.str));
    const articles = row.find((item) => item.x >= 198 && item.x < 232 && /^\d+$/.test(item.str));
    if (!owning || !type || !articles) continue;

    const numberParts = items
      .filter(
        (item) =>
          item.page === serial.page &&
          item.x >= 118 &&
          item.x < 160 &&
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

  const text = linesFrom(items).join('\n');
  if (!/electronically transmitted railway receipt|\(et-rr\)/i.test(text)) {
    const error = new Error('This PDF does not contain an electronically Transmitted Railway Receipt (eT-RR).');
    error.status = 400;
    throw error;
  }

  const header = text.match(
    /RR No:\s*(\S+)\s+RR Date:\s*(\d{2}-\d{2}-\d{4})\s+FNR:\s*(\S+)\s+Station From:\s*(\S+)\s+Station To:\s*(\S+)/i
  );
  if (!header) {
    const error = new Error('Could not read RR No, RR Date, FNR, Station From, and Station To from the eT-RR.');
    error.status = 400;
    throw error;
  }

  const commodityMatch = text.match(/Commodity Description:\s*(.+)/i);
  const commodityDescription = commodityMatch ? commodityMatch[1].trim() : '';
  if (!commodityDescription) {
    const error = new Error('Could not read the commodity description from the eT-RR.');
    error.status = 400;
    throw error;
  }

  const codes = text.match(/Consignor Code:\s*(\S+)\s+Consignee Code:\s*(\S+)/i);
  const wagons = extractWagons(items);
  if (!wagons.length) {
    const error = new Error('Could not read wagon rows (S.no, owning railway, type, wagon no, articles) from the eT-RR.');
    error.status = 400;
    throw error;
  }

  return {
    rrNo: header[1],
    rrDate: header[2],
    fnr: header[3],
    stationFrom: header[4],
    stationTo: header[5],
    commodityDescription,
    consignorCode: codes ? codes[1] : null,
    consigneeCode: codes ? codes[2] : null,
    rrLine: `RR No: ${header[1]} RR Date: ${header[2]} FNR: ${header[3]} Station From: ${header[4]} Station To: ${header[5]}`,
    commodityLine: `Commodity Description: ${commodityDescription}`,
    wagons,
  };
}

export function toIsoDate(dmy) {
  const [day, month, year] = dmy.split('-');
  return `${year}-${month}-${day}`;
}
