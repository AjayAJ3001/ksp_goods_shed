function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

export function reportDocument(report) {
  const item = (report.groups || []).flatMap((group) => group.items)[0] || {};
  const fields = [
    ['Serial no', item.sno],
    ['Truck number', item.truckNo],
    ['RR No', item.rrNo],
    ['RR Date', item.rrDate],
    ['FNR', item.fnr],
    ['Date', item.date],
    ['Station From', item.stationFrom],
    ['Station To', item.stationTo],
    ['Commodity', item.commodity],
    ['Party name', item.partyName],
    ['Delivery to', item.deliveryTo],
    ['Bags', item.bags],
    ['Set no', item.setNo],
    ['Total bags', item.totalBags],
    ['Balance bags', item.balanceBags],
  ];
  const rows = [];
  for (let index = 0; index < fields.length; index += 2) {
    const pair = fields.slice(index, index + 2);
    rows.push(`<tr>${pair.map(([label, value]) => `<td><span class="k">${escapeHtml(label)}</span><span class="v">${escapeHtml(value || '—')}</span></td>`).join('')}${pair.length === 1 ? '<td></td>' : ''}</tr>`);
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>KSP Goods Shed report</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; color: #122033; margin: 28px; }
    .band { background: #0b2438; color: #f3eee4; text-align: center; font-size: 22px; font-weight: 700; padding: 14px; }
    h1 { text-align: center; letter-spacing: 0.16em; color: #b86a08; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { width: 50%; vertical-align: top; border: 1px solid #d5e1ec; padding: 8px 10px; }
    .k { display: block; font-size: 11px; color: #5d6d7e; font-weight: 700; text-transform: uppercase; }
    .v { display: block; margin-top: 3px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="band">KSP Goods Shed</div>
  <h1>REPORT</h1>
  <table>${rows.join('')}</table>
</body>
</html>`;
}

function openReport(report) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) throw new Error('Allow pop-ups to open this report.');
  popup.document.write(reportDocument(report));
  popup.document.close();
  return popup;
}

export function viewReport(report) {
  openReport(report);
}

export function printReport(report) {
  const popup = openReport(report);
  popup.focus();
  popup.print();
}

export function downloadReport(report) {
  const blob = new Blob([reportDocument(report)], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `KSP-${String(report.label || 'report').replace(/[^\w.-]+/g, '-')}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function shareReport(report) {
  const text = `KSP Goods Shed report\nShown by ${report.label}`;
  if (navigator.share) {
    await navigator.share({ title: 'KSP Goods Shed report', text });
    return;
  }
  downloadReport(report);
}
