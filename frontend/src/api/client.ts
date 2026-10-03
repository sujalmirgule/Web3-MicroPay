/**
 * Typed API Client for Web3 MicroPay Backend
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { timestamp: string; requestId?: string };
  error?: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface UserProfile {
  id: string;
  walletAddress?: string;
  fullName?: string;
  email?: string;
  role: "USER" | "MERCHANT" | "ADMIN";
  createdAt?: string;
}

export interface NotificationRecord {
  id: string;
  userId?: string;
  recipientId?: string;
  type: string;
  title: string;
  message: string;
  status: "UNREAD" | "READ";
  read: boolean;
  amount?: string;
  sender?: string;
  receiver?: string;
  channelId?: string;
  transactionHash?: string;
  timestamp: string;
}

export interface ChannelItem {
  channelId: string;
  status: "PENDING" | "OPEN" | "DISPUTED" | "CLOSED";
  totalDeposit: string;
  settledAmount: string;
  reservedAmount: string;
  remainingAvailable?: string;
  availableBalance?: string;
  payerAddress?: string;
  recipientAddress?: string;
  tokenAddress?: string;
  expirationTimestamp?: string | number;
  disputePeriodSeconds?: string | number;
  openTxHash?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SubmitVoucherRequest {
  channelId: string;
  nonce: number;
  cumulativeAmount: string;
  signature: string;
  validUntil?: string | number;
  payer?: string;
  recipient?: string;
}

export interface SubmitVoucherResponse {
  authorized: boolean;
  channelId: string;
  nonce: number;
  cumulativeAmount: string;
  availableBalance: string;
}

export interface SettlementClaimResponse {
  settlementId: string;
  channelId: string;
  status: "PENDING" | "SUBMITTED" | "MINED" | "CONFIRMED" | "FAILED";
  claimedAmount: string;
  estimatedGasCostGwei?: string;
}

export interface SettlementDetail {
  settlementId: string;
  channelId: string;
  status: "PENDING" | "SUBMITTED" | "MINED" | "CONFIRMED" | "FAILED";
  claimedAmount: string;
  netPayout: string;
  txHash: string | null;
  blockNumber: string | null;
  finalizedAt: string | null;
}

export interface WebhookConfigItem {
  webhookId: string;
  url: string;
  events: string[];
  isEnabled: boolean;
  createdAt: string;
}

export interface AiEvaluationResponse {
  evaluationId: string;
  riskScore: number;
  flag: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";
  reasoningTags: string[];
}

export class MicroPayApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private apiKey: string | null = null;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("micropay_access_token");
      this.apiKey = localStorage.getItem("micropay_api_key");
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("micropay_access_token", token);
      else localStorage.removeItem("micropay_access_token");
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setApiKey(apiKey: string | null): void {
    this.apiKey = apiKey;
    if (typeof window !== "undefined") {
      if (apiKey) localStorage.setItem("micropay_api_key", apiKey);
      else localStorage.removeItem("micropay_api_key");
    }
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (err: any) {
      throw new ApiError(
        "NETWORK_UNAVAILABLE",
        "Unable to reach Web3 MicroPay backend server. Check connection or backend status.",
        0,
        err?.message
      );
    }

    let body: any;
    try {
      body = await response.json();
    } catch {
      throw new ApiError(
        "INVALID_RESPONSE",
        `Server returned non-JSON response (HTTP ${response.status})`,
        response.status
      );
    }

    if (body?.offline === true) {
      return (body.data ?? null) as T;
    }

    if (!response.ok || body.success === false) {
      const code = body.error?.code || `HTTP_${response.status}`;
      const message = body.error?.message || response.statusText || "Request failed";
      throw new ApiError(code, message, response.status, body.error?.details);
    }

    return body.data as T;
  }

  // ── Auth Endpoints ─────────────────────────────────────────────────────────

  public async getNonce(walletAddress: string): Promise<{ nonce: string; domain: string; statement: string; issuedAt: string }> {
    return this.request("/v1/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    });
  }

  public async verifySiwe(message: string, signature: string): Promise<{ accessToken: string; expiresIn: number; user: UserProfile }> {
    const res = await this.request<{ accessToken: string; expiresIn: number; user: UserProfile }>("/v1/auth/verify-siwe", {
      method: "POST",
      body: JSON.stringify({ message, signature }),
    });
    this.setToken(res.accessToken);
    return res;
  }

  public async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>("/v1/auth/me", { method: "GET" });
  }

  public async signup(payload: { fullName: string; email: string; password: string }): Promise<{ success: boolean; message: string; data?: any }> {
    return this.request("/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async login(payload: { email: string; password: string }): Promise<{ token: string; user: UserProfile }> {
    const res = await this.request<{ token: string; user: UserProfile }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  // ── Notifications Endpoints ────────────────────────────────────────────────

  public async listNotifications(params?: { recipient?: string; address?: string; userId?: string }): Promise<NotificationRecord[]> {
    const query = new URLSearchParams();
    if (params?.recipient) query.set("recipient", params.recipient);
    if (params?.address) query.set("address", params.address);
    if (params?.userId) query.set("userId", params.userId);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return this.request<NotificationRecord[]>(`/v1/notifications${qs}`, { method: "GET" });
  }

  public async postNotification(notification: Partial<NotificationRecord>): Promise<NotificationRecord> {
    return this.request<NotificationRecord>("/v1/notifications", {
      method: "POST",
      body: JSON.stringify(notification),
    });
  }

  public async markNotificationRead(id: string): Promise<void> {
    await this.request("/v1/notifications/mark-read", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }

  public async markAllNotificationsRead(address?: string): Promise<void> {
    await this.request("/v1/notifications/mark-all-read", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }

  // ── Channels Endpoints ─────────────────────────────────────────────────────

  public async registerChannel(payload: {
    channelId: string;
    payerAddress: string;
    recipientAddress: string;
    tokenAddress: string;
    totalDeposit: string;
    expirationTimestamp: number;
    disputePeriodSeconds?: number;
    openTxHash?: string;
    openBlockNumber?: number;
  }): Promise<ChannelItem> {
    return this.request<ChannelItem>("/v1/channels/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async listChannels(): Promise<ChannelItem[]> {
    return this.request<ChannelItem[]>("/v1/channels", { method: "GET" });
  }

  public async getChannel(channelId: string): Promise<ChannelItem> {
    return this.request<ChannelItem>(`/v1/channels/${channelId}`, { method: "GET" });
  }

  // ── Voucher Submission ─────────────────────────────────────────────────────

  public async submitVoucher(voucher: SubmitVoucherRequest): Promise<SubmitVoucherResponse> {
    return this.request<SubmitVoucherResponse>("/v1/vouchers/submit", {
      method: "POST",
      body: JSON.stringify(voucher),
    });
  }

  // ── Settlements ────────────────────────────────────────────────────────────

  public async claimSettlement(channelId: string): Promise<SettlementClaimResponse> {
    return this.request<SettlementClaimResponse>("/v1/settlements/claim", {
      method: "POST",
      body: JSON.stringify({ channelId }),
    });
  }

  public async getSettlement(settlementId: string): Promise<SettlementDetail> {
    return this.request<SettlementDetail>(`/v1/settlements/${settlementId}`, { method: "GET" });
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  public async listWebhookConfigs(): Promise<WebhookConfigItem[]> {
    return this.request<WebhookConfigItem[]>("/v1/webhooks/configs", { method: "GET" });
  }

  public async createWebhookConfig(payload: {
    url: string;
    subscribedEvents: string[];
  }): Promise<{ webhookId: string; hmacSecret: string; url: string; events: string[]; createdAt: string }> {
    return this.request("/v1/webhooks/configs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async replayWebhooks(webhookConfigId: string): Promise<{ requeued: number }> {
    return this.request("/v1/webhooks/replay", {
      method: "POST",
      body: JSON.stringify({ webhookConfigId }),
    });
  }

  // ── AI Advisory ────────────────────────────────────────────────────────────

  public async evaluateRisk(payload: {
    channelId?: string;
    windowMinutes?: number;
    voucherCount: number;
    totalVolumeWei: string;
  }): Promise<AiEvaluationResponse> {
    return this.request<AiEvaluationResponse>("/v1/ai/evaluate-risk", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new MicroPayApiClient();
