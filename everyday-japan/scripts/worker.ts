#!/usr/bin/env tsx
import { runWorkerLoop } from "../os/worker/runner";
import type { QueueName } from "../os/types";

async function main() {
  const queueArg = process.argv.find((a) => a.startsWith("--queue="));
  const maxArg = process.argv.find((a) => a.startsWith("--max="));
  const queue = (queueArg?.split("=")[1] as QueueName | "any") ?? "any";
  const maxJobs = maxArg ? Number(maxArg.split("=")[1]) : 50;

  const n = await runWorkerLoop({ queue, maxJobs });
  console.log(`Processed ${n} jobs (queue=${queue})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
