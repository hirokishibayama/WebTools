import type { Agent, AgentManifest } from "../types";
import { getManifest } from "./load";

/** Prefer registry.json; fall back to local stub during module init. */
export function manifestOrStub(id: AgentManifest["id"], stub: Partial<AgentManifest>): AgentManifest {
  try {
    return getManifest(id);
  } catch {
    return {
      id,
      version: "0.0.0",
      queue: stub.queue ?? "trend",
      module: stub.module ?? "",
      description: stub.description ?? "",
      dependencies: stub.dependencies ?? [],
      retry: stub.retry ?? { max: 3, retryableErrors: [] },
      timeoutMs: stub.timeoutMs ?? 60000,
      mock: true,
      ...stub,
    } as AgentManifest;
  }
}

export function defineAgent(agent: Agent): Agent {
  return agent;
}
