#!/usr/bin/env tsx
import { runScheduler } from "../os/scheduler/run";

async function main() {
  const noDrain = process.argv.includes("--no-drain");
  const maxArg = process.argv.find((a) => a.startsWith("--max="));
  const maxJobs = maxArg ? Number(maxArg.split("=")[1]) : 300;

  console.log("Everyday Japan OS — scheduler starting…");
  const result = await runScheduler({ drain: !noDrain, maxJobs });
  console.log(JSON.stringify(result, null, 2));
  console.log("Done. Open Dashboard: npm run dev → http://localhost:3000");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
