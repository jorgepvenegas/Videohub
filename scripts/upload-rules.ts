// What GitHub's browser upload ("Add files via upload") silently leaves out: any file or folder whose name starts
// with a dot. Used by make-upload.ts and upload-rules.test.ts.
export const droppedByBrowser = (rel: string) => rel.split(/[\\/]/).some((s: string) => s.startsWith('.'));

// the only dot files the repo may have: they are left out of the upload on purpose (.gitattributes export-ignore)
export const ALLOWED_DOT_FILES = new Set(['.gitattributes', '.gitignore']);
