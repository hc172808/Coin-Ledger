import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { users, wallets, transactions, cards, paymentRequests, auditLogs } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

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

      const [wallet] = await db
        .insert(wallets)
        .values({
          userId: user.id,
          address: generateWalletAddress(),
          internetFundsBalance: "100.00",
          gydBalance: "50.00000000",
          gydsBalance: "10.00000000",
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
        },
        wallet: {
          id: wallet.id,
          gydBalance: wallet.gydBalance,
          gydsBalance: wallet.gydsBalance,
          internetFundsBalance: wallet.internetFundsBalance,
          address: wallet.address,
        },
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

      res.json({
        id: wallet.id,
        gydBalance: wallet.gydBalance,
        gydsBalance: wallet.gydsBalance,
        internetFundsBalance: wallet.internetFundsBalance,
        address: wallet.address,
      });
    } catch (error) {
      console.error("Wallet fetch error:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
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

      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const idempotencyKey = `send_${userId}_${Date.now()}_${Math.random()}`;

      const [transaction] = await db
        .insert(transactions)
        .values({
          fromUserId: userId,
          toAddress: recipient,
          type: "send",
          fundType,
          amount: String(amount),
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

  const httpServer = createServer(app);
  return httpServer;
}
