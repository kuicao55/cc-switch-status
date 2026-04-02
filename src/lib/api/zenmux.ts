import { invoke } from "@tauri-apps/api/core";

export interface ZenmuxSubscription {
  plan: {
    tier: string;
    amount_usd: number;
    interval: string;
    expires_at: string;
  };
  currency: string;
  base_usd_per_flow: number;
  effective_usd_per_flow: number;
  account_status: string;
  quota_5_hour: {
    usage_percentage: number;
    resets_at: string | null;
    max_flows: number;
    used_flows: number;
    remaining_flows: number;
    used_value_usd: number;
    max_value_usd: number;
  };
  quota_7_day: {
    usage_percentage: number;
    resets_at: string | null;
    max_flows: number;
    used_flows: number;
    remaining_flows: number;
    used_value_usd: number;
    max_value_usd: number;
  };
  quota_monthly: {
    max_flows: number;
    max_value_usd: number;
  };
}

export interface PaygBalance {
  currency: string;
  total_credits: number;
  top_up_credits: number;
  bonus_credits: number;
}

export const zenmuxApi = {
  getSubscription: async (apiKey: string): Promise<ZenmuxSubscription> => {
    return invoke("fetch_zenmux_subscription", { apiKey });
  },
  getPaygBalance: async (apiKey: string): Promise<PaygBalance> => {
    return invoke("fetch_zenmux_payg_balance", { apiKey });
  },
};
