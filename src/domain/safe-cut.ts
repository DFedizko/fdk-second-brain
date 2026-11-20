const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;

export function safeCutIndex(text: string, end: number): number {
  const last = text.charCodeAt(end - 1);
  const splitsPair = last >= HIGH_SURROGATE_MIN && last <= HIGH_SURROGATE_MAX;
  return splitsPair ? end - 1 : end;
}
