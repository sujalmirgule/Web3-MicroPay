export const EIP712_DOMAIN_NAME = "Web3MicroPayVault";
export const EIP712_DOMAIN_VERSION = "1";

export const MICRO_VOUCHER_TYPES: Record<string, Array<{ name: string; type: string }>> = {
  MicroVoucher: [
    { name: "channelId", type: "bytes32" },
    { name: "payer", type: "address" },
    { name: "recipient", type: "address" },
    { name: "cumulativeAmount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "validUntil", type: "uint48" }
  ]
};

export function getMicroPayDomain(chainId: bigint | number, verifyingContract: string) {
  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  };
}
