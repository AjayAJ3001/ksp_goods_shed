function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function groupsFor(wagons) {
  const grouped = new Map();
  for (const wagon of wagons || []) {
    const setNo = String(wagon.shedNo || '').trim() || '—';
    if (!grouped.has(setNo)) grouped.set(setNo, []);
    grouped.get(setNo).push(wagon);
  }
  return [...grouped.entries()].sort(([a], [b]) => Number(a) - Number(b));
}

export function receiptDocument(receipt) {
  const sections = groupsFor(receipt.wagons).map(([setNo, wagons]) => `
    <h2>Set no: ${escapeHtml(setNo)}</h2>
    <p>Total bags: ${escapeHtml((receipt.sets || []).find((set) => String(set.setNo) === String(setNo))?.totalBags ?? wagons.reduce((sum, wagon) => sum + Number(wagon.articleCount || 0), 0))}</p>
    <p>Balance bags: ${escapeHtml((receipt.sets || []).find((set) => String(set.setNo) === String(setNo))?.balanceBags ?? wagons.reduce((sum, wagon) => sum + Number(wagon.articleCount || 0), 0))}</p>
    <table>
      <thead><tr><th>S.no</th><th>Owning Rly</th><th>Type</th><th>Wagon No</th><th>No. of Article</th></tr></thead>
      <tbody>
        ${wagons.map((wagon) => `
          <tr>
            <td>${escapeHtml(wagon.sno)}</td>
            <td>${escapeHtml(wagon.owningRly)}</td>
            <td>${escapeHtml(wagon.wagonType)}</td>
            <td>${escapeHtml(wagon.wagonNo)}</td>
            <td>${escapeHtml(wagon.articleCount)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`).join('');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RR ${escapeHtml(receipt.rrNo)}</title>
  <style>
    body { font-family: Georgia, serif; color: #1c1915; margin: 32px; }
    .mark { letter-spacing: 0.18em; color: #8a6424; font-size: 12px; }
    h1 { margin: 6px 0 12px; }
    p { margin: 6px 0; line-height: 1.4; }
    h2 { margin: 22px 0 0; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d9d0c2; padding: 6px 8px; text-align: left; }
    th { background: #1b4334; color: #f6f1e7; }
  </style>
</head>
<body>
  <div class="mark">GOODS SHED</div>
  <h1>RR ${escapeHtml(receipt.rrNo)}</h1>
  <p>${escapeHtml(receipt.rrLine)}</p>
  <p>${escapeHtml(receipt.commodityLine)}</p>
  <p>Party name: ${escapeHtml(receipt.partyName)}</p>
  ${sections}
</body>
</html>`;
}

export function printReceipt(receipt) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) throw new Error('Allow pop-ups to print this receipt.');
  popup.document.write(receiptDocument(receipt));
  popup.document.close();
  popup.focus();
  popup.print();
}

export function downloadReceipt(receipt) {
  const blob = new Blob([receiptDocument(receipt)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `RR-${receipt.rrNo}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareReceipt(receipt) {
  const file = new File([receiptDocument(receipt)], `RR-${receipt.rrNo}.html`, { type: 'text/html' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `RR ${receipt.rrNo}` });
    return;
  }
  if (navigator.share) {
    await navigator.share({
      title: `RR ${receipt.rrNo}`,
      text: `${receipt.rrLine}\n${receipt.commodityLine}\nParty name: ${receipt.partyName}`,
    });
    return;
  }
  downloadReceipt(receipt);
}
