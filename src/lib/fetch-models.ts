import { groupAndSortModels, type ModelChoice, type ModelGroup } from "./models.js";

export async function fetchLiteLLMModels(
  env: Record<string, string>,
): Promise<ModelGroup[]> {
  // Base URL stored as ANTHROPIC_BEDROCK_BASE_URL (e.g. "https://xxx/bedrock")
  // The /models endpoint lives at the root, so strip the /bedrock suffix
  const baseUrl = (env.ANTHROPIC_BEDROCK_BASE_URL ?? "").replace(/\/bedrock\/?$/, "");
  if (!baseUrl) return [];

  const url = `${baseUrl}/models`;
  const headers: Record<string, string> = {};
  if (env.ANTHROPIC_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${env.ANTHROPIC_AUTH_TOKEN}`;
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);

  const json = (await res.json()) as { data?: { id?: string }[] };
  const ids: string[] = (json.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));

  return groupAndSortModels(ids);
}
