export function officialPartyName(typed, names) {
  const name = String(typed || '').trim().replace(/\s+/g, ' ');
  const query = name.toLowerCase();
  if (!query) return name;
  const list = names || [];
  const exact = list.find((item) => item.toLowerCase() === query);
  if (exact) return exact;
  const matches = list.filter((item) => item.toLowerCase().includes(query));
  return matches.length === 1 ? matches[0] : name;
}
