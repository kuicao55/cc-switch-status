import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { usageApi } from "@/lib/api/usage";
import type { UsageData } from "@/types";
import type { AppId } from "@/lib/api/types";

interface UseProviderSubscriptionOptions {
  logLabel?: string;
}

interface UseProviderSubscriptionResult {
  data: UsageData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  apiKey: string | null;
  usagePercentage: number | null;
}

export function useProviderSubscription(
  provider: { id: string; meta?: { usage_script?: { apiKey?: string; enabled?: boolean } } } | null,
  appId: AppId,
  options?: UseProviderSubscriptionOptions,
): UseProviderSubscriptionResult {
  const usageScript = provider?.meta?.usage_script;
  const apiKey = usageScript?.apiKey?.trim() || null;
  const enabled = Boolean(apiKey && usageScript?.enabled && provider?.id);

  const query = useQuery({
    queryKey: ["providerSubscription", provider?.id ?? "", apiKey ?? ""],
    queryFn: async () => {
      if (options?.logLabel) {
        console.info(`[TrayPopup][${options?.logLabel}]`, {
          providerId: provider?.id ?? "",
        });
      }

      const result = await usageApi.query(provider!.id, appId);
      if (!result.success) {
        throw new Error(result.error || "Query failed");
      }
      return result.data?.[0];
    },
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // 计算 usage percentage：优先使用 5h，其次 7d，最后 fallback 到 total/used
  const usagePercentage = useMemo(() => {
    const d = query.data;
    if (d?.window5h?.total && d.window5h.total > 0) {
      return (d.window5h.used / d.window5h.total) * 100;
    }
    if (d?.window7d?.total && d.window7d.total > 0) {
      return (d.window7d.used / d.window7d.total) * 100;
    }
    if (d?.total && d.total > 0 && d.used !== undefined) {
      return (d.used / d.total) * 100;
    }
    return null;
  }, [query.data]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    apiKey,
    usagePercentage,
  };
}
