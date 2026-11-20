const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_GROUP = 1;
const INFO_GROUP = 2;
const FENCE_CHAR_INDEX = 0;
const NO_INFO = "";

export function isFenceLine(line: string): boolean {
  return FENCE_LINE.test(line);
}

export function nextFence(open: string | null, line: string): string | null {
  const match = FENCE_LINE.exec(line);
  if (!match) return open;
  const marker = match[FENCE_GROUP]!;
  if (open === null) return marker;
  return closesFence(open, marker, match[INFO_GROUP]!) ? null : open;
}

function closesFence(open: string, marker: string, info: string): boolean {
  return (
    marker[FENCE_CHAR_INDEX] === open[FENCE_CHAR_INDEX] &&
    marker.length >= open.length &&
    info.trim() === NO_INFO
  );
}
