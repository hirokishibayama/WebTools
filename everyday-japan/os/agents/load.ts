import path from "node:path";
import type { Agent, AgentId, AgentManifest } from "../types";
import { readJson, resolvePath, workspaceRoot } from "../store/fs";

interface RegistryFile {
  version: string;
  agents: AgentManifest[];
}

const cache = new Map<AgentId, Agent>();

export function loadRegistry(): RegistryFile {
  return readJson<RegistryFile>(resolvePath("os/agents/registry.json"), {
    version: "0",
    agents: [],
  });
}

export function getManifest(id: AgentId): AgentManifest {
  const reg = loadRegistry();
  const m = reg.agents.find((a) => a.id === id);
  if (!m) throw new Error(`Agent not in registry: ${id}`);
  return m;
}

export function listManifests(): AgentManifest[] {
  return loadRegistry().agents;
}

/** Dynamically load agent module listed in registry.json */
export async function loadAgent(id: AgentId): Promise<Agent> {
  if (cache.has(id)) return cache.get(id)!;
  const manifest = getManifest(id);
  const abs = path.join(workspaceRoot(), manifest.module);
  const mod = await import(abs);
  const agent: Agent = mod.default ?? mod.agent;
  if (!agent?.run) throw new Error(`Invalid agent module: ${manifest.module}`);
  // Prefer registry manifest as source of truth
  agent.manifest = { ...agent.manifest, ...manifest };
  cache.set(id, agent);
  return agent;
}

export function clearAgentCache(): void {
  cache.clear();
}
