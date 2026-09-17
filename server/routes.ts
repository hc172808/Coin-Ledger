import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { users, wallets, transactions, cards, paymentRequests, auditLogs } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";
import { getConfiguredRpcUrl, getNetlifeGyStatus, setConfiguredRpcUrl, syncWalletOnChainBalance, syncAllOnChainBalances } from "./rpc";
import { createManagedWallet, importManagedWallet, isWalletAddress } from "./wallet";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function generateWalletAddress(): string {
  const bytes = randomUUID().replace(/-/g, "");
  return `0x${bytes.slice(0, 40)}`;
}

function generateToken(): string {
  return randomUUID() + randomUUID();
}

function generateCardNumber(): string {
  const prefix = "4532";
  let number = prefix;
  for (let i = 0; i < 12; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, pin } = req.body;

      if (!username || !email || !password || !pin) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const [user] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashPassword(password),
          pin: hashPassword(pin),
        })
        .returning();

      const walletSetup = req.body.walletSetup as {
        mode?: "later" | "create" | "import" | "external";
        privateKey?: string;
        address?: string;
      } | undefined;
      let address = generateWalletAddress();
      let walletType = "pending";
      let encryptedPrivateKey: string | null = null;
      let oneTimePrivateKey: string | undefined;

      try {
        if (walletSetup?.mode === "create") {
          const created = createManagedWallet();
          address = created.address;
          walletType = "managed";
          encryptedPrivateKey = created.encryptedPrivateKey;
          oneTimePrivateKey = created.privateKey;
        } else if (walletSetup?.mode === "import") {
          if (!walletSetup.privateKey) return res.status(400).json({ message: "Private key is required to import a wallet" });
          const imported = importManagedWallet(walletSetup.privateKey);
          address = imported.address;
          walletType = "managed";
          encryptedPrivateKey = imported.encryptedPrivateKey;
        } else if (walletSetup?.mode === "external") {
          if (!isWalletAddress(walletSetup.address)) return res.status(400).json({ message: "Enter a valid 0x wallet address" });
          address = walletSetup.address;
          walletType = "external";
        }
      } catch {
        return res.status(400).json({ message: "Wallet setup is invalid" });
      }

      const [wallet] = await db
        .insert(wallets)
        .values({
          userId: user.id,
          address,
          walletType,
          encryptedPrivateKey,
          internetFundsBalance: "0.00",
          gydBalance: "0.00000000",
          gydsBalance: "0.00000000",
        })
        .returning();

      const token = generateToken();

      await db.insert(auditLogs).values({
        userId: user.id,
        action: "USER_REGISTERED",
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          twoFactorEnabled: user.twoFactorEnabled,
          profileUpdatedAt: user.profileUpdatedAt,
          nextProfileUpdateAt: user.profileUpdatedAt
            ? new Date(user.profileUpdatedAt.getTime() + ONE_YEAR_MS).toISOString()
            : null,
        },
        wallet: {
          id: wallet.id,
          gydBalance: wallet.gydBalance,
          gydsBalance: wallet.gydsBalance,
          internetFundsBalance: wallet.internetFundsBalance,
          address: wallet.address,
          walletType: wallet.walletType,
        },
        ...(oneTimePrivateKey ? { walletPrivateKey: oneTimePrivateKey } : {}),
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.isFrozen) {
        return res.status(403).json({ message: "Account is frozen" });
      }

      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, user.id),
      });

      const token = generateToken();

      await db.insert(auditLogs).values({
        userId: user.id,
        action: "USER_LOGIN",
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          twoFactorEnabled: user.twoFactorEnabled,
          profileUpdatedAt: user.profileUpdatedAt,
          nextProfileUpdateAt: user.profileUpdatedAt
            ? new Date(user.profileUpdatedAt.getTime() + ONE_YEAR_MS).toISOString()
            : null,
        },
        wallet: wallet
          ? {
              id: wallet.id,
              gydBalance: wallet.gydBalance,
              gydsBalance: wallet.gydsBalance,
              internetFundsBalance: wallet.internetFundsBalance,
              address: wallet.address,
            }
          : null,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/wallet", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      try {
        await syncWalletOnChainBalance(wallet.id, wallet.address);
      } catch (error) {
        // Keep serving the last known balance if the node is temporarily unavailable.
        console.error("On-chain wallet refresh failed:", error);
      }

      const refreshedWallet = await db.query.wallets.findFirst({
        where: eq(wallets.id, wallet.id),
      });

      res.json({
        id: refreshedWallet?.id ?? wallet.id,
        gydBalance: refreshedWallet?.gydBalance ?? wallet.gydBalance,
        gydsBalance: refreshedWallet?.gydsBalance ?? wallet.gydsBalance,
        internetFundsBalance: refreshedWallet?.internetFundsBalance ?? wallet.internetFundsBalance,
        address: refreshedWallet?.address ?? wallet.address,
        walletType: refreshedWallet?.walletType ?? wallet.walletType,
      });
    } catch (error) {
      console.error("Wallet fetch error:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  app.post("/api/wallet/setup", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { mode, privateKey, address } = req.body as {
        mode?: "create" | "import" | "external";
        privateKey?: string;
        address?: string;
      };
      if (!mode) return res.status(400).json({ message: "Wallet setup mode is required" });

      const existing = await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
      if (!existing) return res.status(404).json({ message: "Wallet not found" });

      let nextAddress = existing.address;
      let walletType = existing.walletType;
      let encryptedPrivateKey: string | null = existing.encryptedPrivateKey;
      let oneTimePrivateKey: string | undefined;

      try {
        if (mode === "create") {
          const created = createManagedWallet();
          nextAddress = created.address;
          walletType = "managed";
          encryptedPrivateKey = created.encryptedPrivateKey;
          oneTimePrivateKey = created.privateKey;
        } else if (mode === "import") {
          if (!privateKey) return res.status(400).json({ message: "Private key is required to import a wallet" });
          const imported = importManagedWallet(privateKey);
          nextAddress = imported.address;
          walletType = "managed";
          encryptedPrivateKey = imported.encryptedPrivateKey;
        } else if (mode === "external") {
          if (!isWalletAddress(address)) return res.status(400).json({ message: "Enter a valid 0x wallet address" });
          nextAddress = address;
          walletType = "external";
          encryptedPrivateKey = null;
        } else {
          return res.status(400).json({ message: "Unsupported wallet setup mode" });
        }
      } catch {
        return res.status(400).json({ message: "Wallet setup is invalid" });
      }

      const [updated] = await db.update(wallets).set({
        address: nextAddress,
        walletType,
        encryptedPrivateKey,
      }).where(eq(wallets.id, existing.id)).returning();
      let gydBalance = updated.gydBalance;
      try {
        gydBalance = await syncWalletOnChainBalance(updated.id, updated.address);
      } catch (error) {
        console.error("New wallet on-chain sync failed:", error);
      }
      res.json({
        wallet: { id: updated.id, address: updated.address, walletType: updated.walletType, gydBalance, gydsBalance: updated.gydsBalance, internetFundsBalance: updated.internetFundsBalance },
        ...(oneTimePrivateKey ? { walletPrivateKey: oneTimePrivateKey } : {}),
      });
    } catch (error) {
      console.error("Wallet setup error:", error);
      res.status(500).json({ message: "Wallet setup failed" });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userTransactions = await db.query.transactions.findMany({
        where: or(
          eq(transactions.fromUserId, userId),
          eq(transactions.toUserId, userId)
        ),
        orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
        limit: 50,
      });

      const mapped = userTransactions.map((tx) => ({
        ...tx,
        displayType: tx.toUserId === userId && tx.fromUserId !== userId ? "receive" : tx.type,
      }));

      res.json(mapped);
    } catch (error) {
      console.error("Transactions fetch error:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.patch("/api/auth/change-pin", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { currentPin, newPin } = req.body;
      if (!currentPin || !newPin) {
        return res.status(400).json({ message: "Current and new PIN are required" });
      }
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!user || user.pin !== hashPassword(currentPin)) {
        return res.status(401).json({ message: "Current PIN is incorrect" });
      }
      await db.update(users).set({ pin: hashPassword(newPin) }).where(eq(users.id, userId));
      await db.insert(auditLogs).values({
        userId,
        action: "PIN_CHANGED",
        details: {},
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Change PIN error:", error);
      res.status(500).json({ message: "Failed to change PIN" });
    }
  });

  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { username, email, currentPassword } = req.body ?? {};
      if (typeof username !== "string" || typeof email !== "string" || typeof currentPassword !== "string") {
        return res.status(400).json({ message: "Username, email and current password are required" });
      }

      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (trimmedUsername.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }
      if (trimmedUsername.length > 32) {
        return res.status(400).json({ message: "Username must be 32 characters or fewer" });
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, dots, underscores and hyphens" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }

      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.password !== hashPassword(currentPassword)) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const usernameChanged = trimmedUsername !== user.username;
      const emailChanged = trimmedEmail !== user.email;

      if (!usernameChanged && !emailChanged) {
        return res.json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            twoFactorEnabled: user.twoFactorEnabled,
            profileUpdatedAt: user.profileUpdatedAt,
            nextProfileUpdateAt: user.profileUpdatedAt
              ? new Date(user.profileUpdatedAt.getTime() + ONE_YEAR_MS).toISOString()
              : null,
          },
        });
      }

      if (!user.isAdmin && user.profileUpdatedAt) {
        const nextAllowed = new Date(user.profileUpdatedAt.getTime() + ONE_YEAR_MS);
        if (nextAllowed.getTime() > Date.now()) {
          const niceDate = nextAllowed.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          return res.status(429).json({
            message: `Personal information can only be changed once per year. You can update again on ${niceDate}.`,
            nextProfileUpdateAt: nextAllowed.toISOString(),
            profileUpdatedAt: user.profileUpdatedAt.toISOString(),
          });
        }
      }

      if (usernameChanged) {
        const taken = await db.query.users.findFirst({ where: eq(users.username, trimmedUsername) });
        if (taken && taken.id !== userId) {
          return res.status(409).json({ message: "That username is already taken" });
        }
      }
      if (emailChanged) {
        const taken = await db.query.users.findFirst({ where: eq(users.email, trimmedEmail) });
        if (taken && taken.id !== userId) {
          return res.status(409).json({ message: "That email is already in use" });
        }
      }

      const now = new Date();
      const [updated] = await db
        .update(users)
        .set({ username: trimmedUsername, email: trimmedEmail, profileUpdatedAt: now })
        .where(eq(users.id, userId))
        .returning();

      await db.insert(auditLogs).values({
        userId,
        action: "PROFILE_UPDATED",
        details: {
          previous: { username: user.username, email: user.email },
          updated: { username: updated.username, email: updated.email },
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          isAdmin: updated.isAdmin,
          twoFactorEnabled: updated.twoFactorEnabled,
          profileUpdatedAt: updated.profileUpdatedAt,
          nextProfileUpdateAt: updated.profileUpdatedAt
            ? new Date(updated.profileUpdatedAt.getTime() + ONE_YEAR_MS).toISOString()
            : null,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/auth/change-password", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!user || user.password !== hashPassword(currentPassword)) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      await db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, userId));
      await db.insert(auditLogs).values({
        userId,
        action: "PASSWORD_CHANGED",
        details: {},
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.post("/api/transactions/send", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { recipient, amount, fundType, description } = req.body;

      if (!recipient || !amount || !fundType) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const sender = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!sender) return res.status(404).json({ message: "User not found" });
      if (sender.isFrozen) {
        return res.status(403).json({ message: "Your account is frozen. Contact support to unfreeze." });
      }

      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const balanceField = fundType === "internet_funds" ? wallet.internetFundsBalance
        : fundType === "gyd" ? wallet.gydBalance : wallet.gydsBalance;
      if (parseFloat(balanceField) < numAmount) {
        return res.status(400).json({ message: `Insufficient ${fundType === "internet_funds" ? "Internet Funds" : fundType.toUpperCase()} balance` });
      }

      // Resolve recipient: wallet address (0x...) OR username/email of an existing user
      let toUserId: string | undefined;
      let toAddress: string = String(recipient);
      const isWalletAddress = /^0x[0-9a-fA-F]{40}$/.test(recipient);
      if (isWalletAddress) {
        const targetWallet = await db.query.wallets.findFirst({ where: eq(wallets.address, recipient) });
        if (!targetWallet) {
          return res.status(404).json({ message: "Recipient wallet address not found" });
        }
        toUserId = targetWallet.userId;
      } else {
        const targetUser = await db.query.users.findFirst({
          where: or(eq(users.email, String(recipient).toLowerCase()), eq(users.username, String(recipient))),
        });
        if (!targetUser) {
          return res.status(404).json({ message: "Recipient not found. Check the username, email, or wallet address." });
        }
        if (targetUser.id === userId) {
          return res.status(400).json({ message: "You cannot send funds to yourself" });
        }
        if (targetUser.isFrozen) {
          return res.status(403).json({ message: "Recipient account is frozen and cannot receive funds" });
        }
        toUserId = targetUser.id;
        const targetWallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, targetUser.id) });
        if (targetWallet) toAddress = targetWallet.address;
      }

      const idempotencyKey = `send_${userId}_${Date.now()}_${Math.random()}`;

      const [transaction] = await db
        .insert(transactions)
        .values({
          fromUserId: userId,
          toUserId,
          toAddress,
          type: "send",
          fundType,
          amount: String(numAmount),
          fee: fundType === "internet_funds" ? "0" : "0.001",
          status: "completed",
          description,
          idempotencyKey,
        })
        .returning();

      await db.insert(auditLogs).values({
        userId,
        action: "TRANSACTION_SEND",
        details: { transactionId: transaction.id, amount, fundType, recipient },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ success: true, transaction });
    } catch (error) {
      console.error("Send transaction error:", error);
      res.status(500).json({ message: "Transaction failed" });
    }
  });

  app.get("/api/cards", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userCards = await db.query.cards.findMany({
        where: eq(cards.userId, userId),
      });

      res.json(
        userCards.map((card) => ({
          id: card.id,
          lastFourDigits: card.lastFourDigits,
          expiryDate: card.expiryDate,
          cardType: card.cardType,
          status: card.status,
          dailyLimit: card.dailyLimit,
        }))
      );
    } catch (error) {
      console.error("Cards fetch error:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  app.post("/api/cards", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { cardType, pin } = req.body;

      if (!cardType || !pin) {
        return res.status(400).json({ message: "Card type and PIN are required" });
      }

      const cardNumber = generateCardNumber();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);
      const expiryString = `${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${String(expiryDate.getFullYear()).slice(-2)}`;

      const [card] = await db
        .insert(cards)
        .values({
          userId,
          cardNumber,
          lastFourDigits: cardNumber.slice(-4),
          expiryDate: expiryString,
          cardType,
          pin: hashPassword(pin),
          status: cardType === "physical" ? "pending_approval" : "active",
        })
        .returning();

      await db.insert(auditLogs).values({
        userId,
        action: "CARD_CREATED",
        details: { cardId: card.id, cardType },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        id: card.id,
        lastFourDigits: card.lastFourDigits,
        expiryDate: card.expiryDate,
        cardType: card.cardType,
        status: card.status,
        dailyLimit: card.dailyLimit,
      });
    } catch (error) {
      console.error("Card creation error:", error);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.patch("/api/cards/:id/freeze", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { frozen } = req.body;

      const card = await db.query.cards.findFirst({
        where: eq(cards.id, id),
      });

      if (!card || card.userId !== userId) {
        return res.status(404).json({ message: "Card not found" });
      }

      await db
        .update(cards)
        .set({ status: frozen ? "frozen" : "active" })
        .where(eq(cards.id, id));

      await db.insert(auditLogs).values({
        userId,
        action: frozen ? "CARD_FROZEN" : "CARD_UNFROZEN",
        details: { cardId: id },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Card freeze error:", error);
      res.status(500).json({ message: "Failed to update card" });
    }
  });

  app.get("/api/payment-requests", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const requests = await db.query.paymentRequests.findMany({
        where: eq(paymentRequests.toUserId, userId),
        orderBy: (paymentRequests, { desc }) => [desc(paymentRequests.createdAt)],
      });

      res.json(requests);
    } catch (error) {
      console.error("Payment requests fetch error:", error);
      res.status(500).json({ message: "Failed to fetch payment requests" });
    }
  });

  app.post("/api/payment-requests", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { recipient, amount, fundType, description } = req.body;

      if (!recipient || !amount || !fundType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const recipientUser = await db.query.users.findFirst({
        where: eq(users.email, recipient),
      });

      if (!recipientUser) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [request] = await db
        .insert(paymentRequests)
        .values({
          fromUserId: userId,
          toUserId: recipientUser.id,
          amount: String(amount),
          fundType,
          description,
          expiresAt,
        })
        .returning();

      await db.insert(auditLogs).values({
        userId,
        action: "PAYMENT_REQUEST_CREATED",
        details: { requestId: request.id, amount, fundType, recipientId: recipientUser.id },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json(request);
    } catch (error) {
      console.error("Payment request error:", error);
      res.status(500).json({ message: "Failed to create payment request" });
    }
  });

  // ============ Payment Request Actions ============
  app.patch("/api/payment-requests/:id", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { action } = req.body as { action: "approve" | "decline" };
      if (!["approve", "decline"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const request = await db.query.paymentRequests.findFirst({
        where: eq(paymentRequests.id, req.params.id),
      });
      if (!request) return res.status(404).json({ message: "Request not found" });
      if (request.toUserId !== userId) {
        return res.status(403).json({ message: "Not your request" });
      }
      if (request.status !== "pending") {
        return res.status(400).json({ message: `Request already ${request.status}` });
      }

      if (action === "decline") {
        await db.update(paymentRequests).set({ status: "declined" }).where(eq(paymentRequests.id, request.id));
        await db.insert(auditLogs).values({
          userId, action: "PAYMENT_REQUEST_DECLINED",
          details: { requestId: request.id }, ipAddress: req.ip, userAgent: req.get("user-agent"),
        });
        return res.json({ success: true, status: "declined" });
      }

      // approve → create transaction, mark approved
      const idempotencyKey = `req_${request.id}_${Date.now()}`;
      const [tx] = await db.insert(transactions).values({
        fromUserId: userId,
        toUserId: request.fromUserId,
        type: "send",
        fundType: request.fundType,
        amount: request.amount,
        fee: request.fundType === "internet_funds" ? "0" : "0.001",
        status: "completed",
        description: request.description || "Payment request settlement",
        idempotencyKey,
      }).returning();

      await db.update(paymentRequests).set({ status: "approved" }).where(eq(paymentRequests.id, request.id));
      await db.insert(auditLogs).values({
        userId, action: "PAYMENT_REQUEST_APPROVED",
        details: { requestId: request.id, transactionId: tx.id }, ipAddress: req.ip, userAgent: req.get("user-agent"),
      });
      res.json({ success: true, status: "approved", transaction: tx });
    } catch (error) {
      console.error("Payment request action error:", error);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  // ============ Admin Routes ============
  async function requireAdmin(req: any, res: any): Promise<string | null> {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return null; }
    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!u || !u.isAdmin) { res.status(403).json({ message: "Admin access required" }); return null; }
    return userId;
  }

  app.get("/api/admin/rpc", async (req, res) => {
    const adminId = await requireAdmin(req, res); if (!adminId) return;
    try {
      const status = await getNetlifeGyStatus();
      res.json(status);
    } catch (error) {
      res.status(502).json({ rpcUrl: await getConfiguredRpcUrl(), message: error instanceof Error ? error.message : "RPC unavailable" });
    }
  });

  app.patch("/api/admin/rpc", async (req, res) => {
    const adminId = await requireAdmin(req, res); if (!adminId) return;
    try {
      const { rpcUrl } = req.body as { rpcUrl?: string };
      if (!rpcUrl) return res.status(400).json({ message: "RPC URL is required" });
      const parsed = new URL(rpcUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) return res.status(400).json({ message: "RPC URL must use HTTP or HTTPS" });
      await setConfiguredRpcUrl(parsed.toString().replace(/\/$/, ""));
      const status = await getNetlifeGyStatus();
      const synced = await syncAllOnChainBalances();
      await db.insert(auditLogs).values({ userId: adminId, action: "RPC_URL_UPDATED", details: { rpcUrl: parsed.toString(), synced }, ipAddress: req.ip, userAgent: req.get("user-agent") });
      res.json({ ...status, synced });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "RPC URL is unavailable" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    const adminId = await requireAdmin(req, res); if (!adminId) return;
    try {
      const all = await db.query.users.findMany({
        orderBy: (u, { desc }) => [desc(u.createdAt)],
      });
      res.json(all.map((u) => ({
        id: u.id, username: u.username, email: u.email,
        isAdmin: u.isAdmin, isFrozen: u.isFrozen,
        twoFactorEnabled: u.twoFactorEnabled, createdAt: u.createdAt,
      })));
    } catch (e) { console.error(e); res.status(500).json({ message: "Failed to load users" }); }
  });

  app.patch("/api/admin/users/:id/freeze", async (req, res) => {
    const adminId = await requireAdmin(req, res); if (!adminId) return;
    try {
      const { frozen } = req.body as { frozen: boolean };
      if (req.params.id === adminId && frozen) {
        return res.status(400).json({ message: "You cannot freeze your own admin account" });
      }
      await db.update(users).set({ isFrozen: !!frozen }).where(eq(users.id, req.params.id));
      await db.insert(auditLogs).values({
        userId: adminId, action: frozen ? "ADMIN_USER_FROZEN" : "ADMIN_USER_UNFROZEN",
        details: { targetUserId: req.params.id }, ipAddress: req.ip, userAgent: req.get("user-agent"),
      });
      res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ message: "Failed to update user" }); }
  });

  app.get("/api/admin/cards/pending", async (req, res) => {
    const adminId = await requireAdmin(req, res); if (!adminId) return;
    try {
      const pending = await db.query.cards.findMany({
        where: eq(cards.status, "pending_approval"),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
      const enriched = await Promise.all(pending.map(async (c) => {
        const owner = await db.query.users.findFirst({ where: eq(users.id, c.userId) });
        return {
          id: c.id, lastFourDigits: c.lastFourDigits, cardType: c.cardType,
          expiryDate: c.expiryDate, dailyLimit: c.dailyLimit, createdAt: c.createdAt,
          ownerUsername: owner?.username || "—", ownerEmail: owner?.email || "—",
        };
      }));
      res.json(enriched);
    } catch (e) { console.error(e); res.status(500).json({ message: "Failed to load pending cards" }); }
  });

  app.patch("/api/admin/cards/:id/approve", async (req, res) => {
    const adminId = await requireAdmin(req, res); if (!adminId) return;
    try {
      const { approve } = req.body as { approve: boolean };
      const newStatus = approve ? "active" : "rejected";
      await db.update(cards).set({ status: newStatus }).where(eq(cards.id, req.params.id));
      await db.insert(auditLogs).values({
        userId: adminId, action: approve ? "ADMIN_CARD_APPROVED" : "ADMIN_CARD_REJECTED",
        details: { cardId: req.params.id }, ipAddress: req.ip, userAgent: req.get("user-agent"),
      });
      res.json({ success: true, status: newStatus });
    } catch (e) { console.error(e); res.status(500).json({ message: "Failed to update card" }); }
  });

  app.get("/api/admin/stats", async (req, res) => {
    const adminId = await requireAdmin(req, res); if (!adminId) return;
    try {
      const [allUsers, allTx, allCards, allReqs] = await Promise.all([
        db.query.users.findMany(),
        db.query.transactions.findMany(),
        db.query.cards.findMany(),
        db.query.paymentRequests.findMany(),
      ]);
      const sumByFund = (fund: string) => allTx
        .filter((t) => t.fundType === fund && t.status === "completed")
        .reduce((s, t) => s + parseFloat(t.amount), 0);
      res.json({
        totalUsers: allUsers.length,
        frozenUsers: allUsers.filter((u) => u.isFrozen).length,
        adminUsers: allUsers.filter((u) => u.isAdmin).length,
        totalTransactions: allTx.length,
        completedTransactions: allTx.filter((t) => t.status === "completed").length,
        totalCards: allCards.length,
        activeCards: allCards.filter((c) => c.status === "active").length,
        pendingCards: allCards.filter((c) => c.status === "pending_approval").length,
        frozenCards: allCards.filter((c) => c.status === "frozen").length,
        pendingRequests: allReqs.filter((r) => r.status === "pending").length,
        volumeInternetFunds: sumByFund("internet_funds").toFixed(2),
        volumeGyd: sumByFund("gyd").toFixed(2),
        volumeGyds: sumByFund("gyds").toFixed(2),
      });
    } catch (e) { console.error(e); res.status(500).json({ message: "Failed to load stats" }); }
  });

  const httpServer = createServer(app);
  return httpServer;
}
