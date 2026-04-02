import { useQuery } from "@tanstack/react-query";
import { zenmuxApi } from "@/lib/api";
import type { Provider } from "@/types";

const getZenmuxApiKey = (provider: Provider | null): string | null => {
  const usageScript = provider?.meta?.usage_script;
  const apiKey = usageScript?.apiKey?.trim();
  if (!usageScript?.enabled || !apiKey) {
    return null;
  }

  return apiKey;
};

interface UseZenmuxSubscriptionOptions {
  logLabel?: string;
}

export function useZenmuxSubscription(
  provider: Provider | null,
  options?: UseZenmuxSubscriptionOptions,
) {
  const apiKey = getZenmuxApiKey(provider);

  const query = useQuery({
    queryKey: ["zenmuxSubscription", provider?.id ?? "", apiKey ?? ""],
    queryFn: async () => {
      if (options?.logLabel) {
        console.info(`[TrayPopup][${options.logLabel}]`, {
          providerId: provider?.id ?? "",
        });
      }

      return zenmuxApi.getSubscription(apiKey!);
    },
    enabled: Boolean(apiKey && provider?.id),
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    apiKey,
    usagePercentage: query.data?.quota_5_hour?.usage_percentage ?? null,
  };
}
