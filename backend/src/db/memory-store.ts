import { ChannelDTO } from "@web3-micropay/shared";

export interface DBUser {
  id: string;
  wallet_address: string;
  username?: string;
  role: "USER" | "MERCHANT" | "ADMIN";
  created_at: Date;
}

export interface DBMerchant {
  id: string;
  wallet_address: string;
  business_name: string;
  api_key_hash: string;
  is_active: boolean;
  created_at: Date;
}

export interface DBVoucher {
  id: string;
  channel_id: string;
  nonce: number;
  cumulative_amount: string;
  signature: string;
  valid_until: number;
  is_settled: boolean;
  created_at: Date;
}

export interface DBSettlement {
  id: string;
  channel_id: string;
  voucher_id: string;
  claimed_amount: string;
  net_payout: string;
  relayer_gas_fee: string;
  status: "PENDING" | "MINED" | "CONFIRMED" | "FAILED";
  tx_hash?: string;
  block_number?: number;
  created_at: Date;
}

export interface DBBlockchainEvent {
  id: string;
  event_name: string;
  channel_id: string;
  tx_hash: string;
  block_number: number;
  log_index: number;
  raw_data: any;
  created_at: Date;
}

export interface DBNotificationOutbox {
  id: string;
  merchant_id: string;
  event_type: string;
  payload: any;
  target_url: string;
  delivery_status: "PENDING" | "DELIVERED" | "FAILED" | "DEAD_LETTER";
  attempts: number;
  next_retry_at: Date;
  created_at: Date;
}

export class DatabaseStore {
  public users = new Map<string, DBUser>();
  public merchants = new Map<string, DBMerchant>();
  public channels = new Map<string, ChannelDTO>();
  public vouchers: DBVoucher[] = [];
  public settlements = new Map<string, DBSettlement>();
  public blockchainEvents: DBBlockchainEvent[] = [];
  public notificationOutbox: DBNotificationOutbox[] = [];

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed initial test merchant (Bob Publisher)
    const merchantWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    this.merchants.set(merchantWallet.toLowerCase(), {
      id: "m_seed_1",
      wallet_address: merchantWallet,
      business_name: "Bob Publisher",
      api_key_hash: "seed_hash_bob",
      is_active: true,
      created_at: new Date(),
    });
  }

  public getChannel(channelId: string): ChannelDTO | undefined {
    return this.channels.get(channelId.toLowerCase());
  }

  public saveChannel(channel: ChannelDTO): void {
    this.channels.set(channel.channelId.toLowerCase(), channel);
  }

  public saveVoucher(voucher: DBVoucher): void {
    this.vouchers.push(voucher);
  }

  public getLatestVoucher(channelId: string): DBVoucher | undefined {
    const list = this.vouchers.filter((v) => v.channel_id.toLowerCase() === channelId.toLowerCase());
    if (list.length === 0) return undefined;
    return list.sort((a, b) => b.nonce - a.nonce)[0];
  }
}

export const dbStore = new DatabaseStore();
