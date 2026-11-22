// @ts-nocheck
// Same tools as the MCP server, for sessions that do not have it:
//   node server/cli.ts hub_notes '{"project":"C:\\path\\to\\film"}'
//   node server/cli.ts list
import { TOOLS } from './tools.ts';

const [name, json] = process.argv.slice(2);
if (!name || name === 'list' || !TOOLS[name]) {
  console.log(
    'Tools:\n' +
      Object.entries(TOOLS)
        .map(([k, t]) => `  ${k} — ${t.description.split('.')[0]}`)
        .join('\n')
  );
  process.exit(name && name !== 'list' ? 1 : 0);
}
// exitCode instead of process.exit(): exiting while fetch sockets close can trip a libuv assertion
try {
  const args = json ? JSON.parse(json) : {};
  console.log(await TOOLS[name].run(args));
} catch (e) {
  console.error('Error:', e.message || e);
  process.exitCode = 1;
}
