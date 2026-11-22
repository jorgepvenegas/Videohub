// Preserve the existing positional API for callers.
import { pickFolder as platformPickFolder } from './platform.ts';

export function pickFolder(start: string | undefined, title = 'Choose folder') {
  return platformPickFolder({ start, title });
}
