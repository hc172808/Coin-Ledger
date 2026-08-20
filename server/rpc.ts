import { db } from "./db";
import { wallets } from "@shared/schema";
import { eq } from "drizzle-orm";

export const NETLIFEGY_RPC_URL =
  process.env.NETLIFEGY_RPC_URL || "https://rpc.netlifegy.com";
export const NETLIFEGY_CHAIN_ID = 198282;

type RpcResponse<T> = {
  result?: T;
  error?: { code: number; message: string };
};

async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(NETLIFEGY_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`RPC returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as RpcResponse<T>;
  if (payload.error) {
    throw new Error(`RPC ${payload.error.code}: ${payload.error.message}`);
  }
  if (payload.result === undefined) {
    throw new Error("RPC response did not include a result");
  }
  return payload.result;
}

function formatWeiAsGyd(value: string): string {
  const wei = BigInt(value);
  const whole = wei / 100_000_000n;
  const fraction = (wei % 100_000_000n).toString().padStart(8, "0");
  return `${whole}.${fraction}`;
}

export async function getNetlifeGyStatus() {
  const [chainId, blockNumber] = await Promise.all([
    rpcCall<string>("eth_chainId"),
    rpcCall<string>("eth_blockNumber"),
  ]);

  const numericChainId = Number.parseInt(chainId, 16);
  if (numericChainId !== NETLIFEGY_CHAIN_ID) {
    throw new Error(
      `Unexpected chain ID ${numericChainId}; expected ${NETLIFEGY_CHAIN_ID}`,
    );
  }

  return {
    rpcUrl: NETLIFEGY_RPC_URL,
    chainId: numericChainId,
    blockNumber: Number.parseInt(blockNumber, 16),
  };
}

export async function syncWalletOnChainBalance(walletId: string, address: string) {
  const balanceHex = await rpcCall<string>("eth_getBalance", [address, "latest"]);
  const gydBalance = formatWeiAsGyd(balanceHex);

  await db
    .update(wallets)
    .set({ gydBalance })
    .where(eq(wallets.id, walletId));

  return gydBalance;
}

export async function syncAllOnChainBalances() {
  const allWallets = await db.select({
    id: wallets.id,
    address: wallets.address,
  }).from(wallets);

  let synced = 0;
  for (const wallet of allWallets) {
    try {
      await syncWalletOnChainBalance(wallet.id, wallet.address);
      synced++;
    } catch (error) {
      console.error(`On-chain balance sync failed for ${wallet.address}:`, error);
    }
  }
  return synced;
}