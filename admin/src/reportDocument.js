import logoUrl from './assets/train-logo.jpg';

const APP_NAME = 'KSP Goods Shed';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function show(value) {
  return escapeHtml(value === 0 || value ? value : '—');
}

export function reportColumns(item = {}) {
  return [
    ['S.no', item.sno],
    ['Vehicle no', item.truckNo],
    ['Party name', item.partyName],
    ['RR No', item.rrNo],
    ['RR Date', item.rrDate],
    ['FNR', item.fnr],
    ['Date', item.date],
    ['Station from', item.stationFrom],
    ['Station to', item.stationTo],
    ['Commodity', item.commodity],
    ['Delivery to', item.deliveryTo],
    ['Bags', item.bags],
    ['Set no', item.setNo],
    ['Total bags', item.totalBags],
    ['Wagon no', item.wagonNo],
    ['Balance bags', item.balanceBags],
  ];
}

export function reportDocument(report) {
  const logo = new URL(logoUrl, window.location.href).href;
  const columns = reportColumns();
  const head = columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join('');
  const items = (report.groups || []).flatMap((group) => group.items || []);
  const body = items.map((item) => `<tr>${reportColumns(item).map(([, value]) => `<td>${show(value)}</td>`).join('')}</tr>`).join('')
    || `<tr><td colspan="${columns.length}">No trucks have taken bags yet.</td></tr>`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(APP_NAME)} — REPORT</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #122033; margin: 0; }
    .letter { width: 100%; border-collapse: collapse; }
    .letter td { border: 0; vertical-align: middle; padding: 0; }
    .logo { width: 42px; height: 42px; }
    .name { font-size: 16px; font-weight: 800; letter-spacing: 0.12em; color: #0B1B33; }
    .sub { margin-top: 2px; font-size: 9px; letter-spacing: 0.14em; font-weight: 700; color: #8a6424; }
    .rule { height: 3px; background: #0B1B33; border-bottom: 3px solid #E0A020; margin: 6px 0 8px; }
    .doc { text-align: center; font-size: 13px; letter-spacing: 0.2em; font-weight: 800; color: #0f6e8c; margin-bottom: 8px; }
    table.grid { width: 100%; border-collapse: collapse; }
    table.grid th, table.grid td { border: 1px solid #c5d3e0; padding: 5px 4px; text-align: left; font-size: 9px; white-space: nowrap; }
    table.grid th { background: #0B1B33; color: #fff; font-size: 8px; letter-spacing: 0.02em; text-transform: uppercase; }
    table.grid tr { page-break-inside: avoid; }
    table.grid thead { display: table-header-group; }
  </style>
</head>
<body>
  <table class="letter">
    <tr>
      <td style="width:52px;"><img class="logo" src="${logo}" alt="KSP Goods Shed" /></td>
      <td>
        <div class="name">${escapeHtml(APP_NAME)}</div>
        <div class="sub">RAILWAY GOODS OFFICE</div>
      </td>
    </tr>
  </table>
  <div class="rule"></div>
  <div class="doc">REPORT</div>
  <table class="grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body>
</html>`;
}

export function printReport(report) {
  const frame = document.createElement('iframe');
  frame.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0');
  frame.srcdoc = reportDocument(report);
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    frame.contentWindow.onafterprint = () => frame.remove();
  };
  document.body.appendChild(frame);
}

export function downloadReport(report) {
  printReport(report);
}

export async function shareReport(report) {
  const text = `KSP Goods Shed report\nShown by ${report.label}`;
  if (navigator.share) {
    await navigator.share({ title: 'KSP Goods Shed report', text });
    return;
  }
  printReport(report);
}
