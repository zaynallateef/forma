export type PositionedText = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
};
export function pdfTextLayout(items: PositionedText[]): string {
  const rows: { y: number; height: number; items: PositionedText[] }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = item.transform[5];
    let row = rows.find(
      (row) =>
        Math.abs(row.y - y) <=
        Math.max(2, Math.min(row.height, item.height || 10) * 0.4),
    );
    if (!row) {
      row = { y, height: item.height || 10, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => {
      const rtl = /[\u0600-\u06ff]/.test(
        row.items.map((item) => item.str).join(""),
      );
      const words = row.items.sort(
        (a, b) => (a.transform[4] - b.transform[4]) * (rtl ? -1 : 1),
      );
      let result = "";
      let right = 0;
      for (const word of words) {
        const gap = rtl
          ? right - word.transform[4] - word.width
          : word.transform[4] - right;
        const charWidth = Math.max(
          3,
          word.width / Math.max(1, word.str.length),
        );
        result +=
          (result ? (gap > charWidth * 2.5 ? "  " : " ") : "") + word.str;
        right = rtl ? word.transform[4] : word.transform[4] + word.width;
      }
      return result.trim();
    })
    .join("\n");
}
