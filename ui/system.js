// Server capabilities provide platform wording without importing Node code into the UI.
let current = {};
export function setSystemCapabilities(value) { current = value && typeof value === 'object' ? value : {}; }
export const trashName = () => current.trashLabel || 'Trash';
export function sameFolder(a, b) {
  // Preserve case and literal backslashes; only trailing slashes are ignored.
  const key = value => {
    const s = String(value || '').trim();
    return s.replace(/\/+$/, '') || (s.startsWith('/') ? '/' : '');
  };
  return key(a) === key(b);
}
