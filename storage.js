const KEY='rainbow-breaker-best-v1';
export function readBest(storage) {
  try { const n=Number(storage?.getItem(KEY)); return Number.isSafeInteger(n)&&n>=0?n:0; } catch { return 0; }
}
export function saveBest(storage,score) {
  try { if(!storage || !Number.isSafeInteger(score)||score<0) return false; storage.setItem(KEY,String(score)); return true; } catch { return false; }
}
