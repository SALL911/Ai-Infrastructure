import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

export interface TaiwanBrand {
  id: number;
  name: string;
  nameEn: string;
  ticker: string;
  industry: string;
  score: number;
  weekChange: number;
  status: string;
  description: string;
  website: string;
  employees: string;
  marketCap: string;
  knowledgeGraph: number;
  aiCitation: number;
  semanticSearch: number;
  multimodal: number;
  claimed: boolean;
  claimedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RankingStats {
  total: number;
  avgScore: number;
  rising: number;
  falling: number;
  claimed: number;
  byIndustry: Record<string, number>;
  topBrands: { id: number; name: string; score: number; industry: string; weekChange: number }[];
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useRankings(industry?: string) {
  const params = industry && industry !== "all" ? `?industry=${industry}` : "";
  return useQuery<TaiwanBrand[]>({
    queryKey: ["rankings", industry ?? "all"],
    queryFn: () => fetchJson<TaiwanBrand[]>(`/rankings${params}`),
    staleTime: 30000,
  });
}

export function useBrand(id: number | null) {
  return useQuery<TaiwanBrand>({
    queryKey: ["brand", id],
    queryFn: () => fetchJson<TaiwanBrand>(`/rankings/${id}`),
    enabled: id !== null,
    staleTime: 30000,
  });
}

export function useRankingStats() {
  return useQuery<RankingStats>({
    queryKey: ["ranking-stats"],
    queryFn: () => fetchJson<RankingStats>(`/rankings/stats/summary`),
    staleTime: 30000,
  });
}

export function useClaimBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, company, email, name }: { id: number; company: string; email: string; name: string }) => {
      const res = await fetch(`${API_BASE}/rankings/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, email, name }),
      });
      if (!res.ok) throw new Error("Claim failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rankings"] });
      qc.invalidateQueries({ queryKey: ["ranking-stats"] });
    },
  });
}
