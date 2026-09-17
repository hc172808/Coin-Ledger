import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";
import { Wallet } from "ethers";

const ENCRYPTION_VERSION = "v1";

function getEncryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured before creating or importing wallets");
  }
  return scryptSync(secret, "gyds-wallet-key", 32);
}

export function encryptPrivateKey(privateKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function createManagedWallet() {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    encryptedPrivateKey: encryptPrivateKey(wallet.privateKey),
    privateKey: wallet.privateKey,
  };
}

export function importManagedWallet(privateKey: string) {
  const wallet = new Wallet(privateKey.trim());
  return {
    address: wallet.address,
    encryptedPrivateKey: encryptPrivateKey(wallet.privateKey),
  };
}

export function isWalletAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function normalizeExternalAddress(address: string) {
  return `0x${createHash("sha256").update(address.slice(2), "hex").digest("hex").slice(-40)}`;
}