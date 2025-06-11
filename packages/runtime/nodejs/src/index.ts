import { createServer } from '@server/index';

async function main() {
  const server = await createServer();
  server.start();
}

main();
