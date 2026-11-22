// Server capabilities provide platform wording without importing Node code into the UI.
let current: { trashLabel?: string } = {};
export function setSystemCapabilities(value: unknown) {
  current = value && typeof value === 'object' ? value : {};
}
export const trashName = () => current.trashLabel || 'Trash';
export function sameFolder(a: unknown, b: unknown) {
  // Preserve case and literal backslashes; only trailing slashes are ignored.
  const key = (value: unknown) => {
    const s = String(value || '').trim();
    return s.replace(/\/+$/, '') || (s.startsWith('/') ? '/' : '');
  };
  return key(a) === key(b);
}
