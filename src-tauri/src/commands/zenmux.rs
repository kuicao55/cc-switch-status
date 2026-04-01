//! ZenMux API commands

use crate::error::AppError;
use serde::{Deserialize, Serialize};

/// Subscription detail from ZenMux API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenmuxSubscription {
    pub plan: PlanInfo,
    pub currency: String,
    pub base_usd_per_flow: f64,
    pub effective_usd_per_flow: f64,
    pub account_status: String,
    pub quota_5_hour: QuotaInfo,
    pub quota_7_day: QuotaInfo,
    pub quota_monthly: MonthlyQuotaInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanInfo {
    pub tier: String,
    pub amount_usd: f64,
    #[serde(rename = "interval")]
    pub billing_interval: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaInfo {
    pub usage_percentage: f64,
    pub resets_at: Option<String>,
    pub max_flows: f64,
    pub used_flows: f64,
    pub remaining_flows: f64,
    pub used_value_usd: f64,
    pub max_value_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyQuotaInfo {
    pub max_flows: f64,
    pub max_value_usd: f64,
}

#[tauri::command]
pub async fn fetch_zenmux_subscription(
    api_key: String,
) -> Result<ZenmuxSubscription, AppError> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://zenmux.ai/api/v1/management/subscription/detail")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| AppError::Message(format!("API request failed: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Message(format!(
            "API error: {}",
            response.status()
        )));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Message(format!("Failed to parse response: {}", e)))?;

    // Parse the response into our structure
    let data = json.get("data").ok_or_else(|| {
        AppError::Message("Missing 'data' field in response".to_string())
    })?;

    let subscription = ZenmuxSubscription {
        plan: PlanInfo {
            tier: data.get("plan").and_then(|p| p.get("tier"))
                .and_then(|v| v.as_str()).unwrap_or("free").to_string(),
            amount_usd: data.get("plan").and_then(|p| p.get("amount_usd"))
                .and_then(|v| v.as_f64()).unwrap_or(0.0),
            billing_interval: data.get("plan").and_then(|p| p.get("interval"))
                .and_then(|v| v.as_str()).unwrap_or("month").to_string(),
            expires_at: data.get("plan").and_then(|p| p.get("expires_at"))
                .and_then(|v| v.as_str()).unwrap_or("").to_string(),
        },
        currency: data.get("currency")
            .and_then(|v| v.as_str()).unwrap_or("usd").to_string(),
        base_usd_per_flow: data.get("base_usd_per_flow")
            .and_then(|v| v.as_f64()).unwrap_or(0.0),
        effective_usd_per_flow: data.get("effective_usd_per_flow")
            .and_then(|v| v.as_f64()).unwrap_or(0.0),
        account_status: data.get("account_status")
            .and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
        quota_5_hour: parse_quota_info(data.get("quota_5_hour")),
        quota_7_day: parse_quota_info(data.get("quota_7_day")),
        quota_monthly: MonthlyQuotaInfo {
            max_flows: data.get("quota_monthly").and_then(|q| q.get("max_flows"))
                .and_then(|v| v.as_f64()).unwrap_or(0.0),
            max_value_usd: data.get("quota_monthly").and_then(|q| q.get("max_value_usd"))
                .and_then(|v| v.as_f64()).unwrap_or(0.0),
        },
    };

    Ok(subscription)
}

fn parse_quota_info(v: Option<&serde_json::Value>) -> QuotaInfo {
    match v {
        Some(q) => QuotaInfo {
            usage_percentage: q.get("usage_percentage")
                .and_then(|v| v.as_f64()).unwrap_or(0.0),
            resets_at: q.get("resets_at").and_then(|v| v.as_str()).map(String::from),
            max_flows: q.get("max_flows").and_then(|v| v.as_f64()).unwrap_or(0.0),
            used_flows: q.get("used_flows").and_then(|v| v.as_f64()).unwrap_or(0.0),
            remaining_flows: q.get("remaining_flows").and_then(|v| v.as_f64()).unwrap_or(0.0),
            used_value_usd: q.get("used_value_usd").and_then(|v| v.as_f64()).unwrap_or(0.0),
            max_value_usd: q.get("max_value_usd").and_then(|v| v.as_f64()).unwrap_or(0.0),
        },
        None => QuotaInfo {
            usage_percentage: 0.0,
            resets_at: None,
            max_flows: 0.0,
            used_flows: 0.0,
            remaining_flows: 0.0,
            used_value_usd: 0.0,
            max_value_usd: 0.0,
        },
    }
}
