import type { Plugin } from "vite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

interface StoredNotification {
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

const JWT_SECRET = "web3_micropay_auth_secret_salt_2026_key";
const STORE_FILE = path.resolve(process.cwd(), ".api-store.json");

function loadStore(): { users: StoredUser[]; notifications: StoredNotification[] } {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
      return {
        users: data.users || [],
        notifications: data.notifications || [],
      };
    }
  } catch {
    // ignore
  }
  return { users: [], notifications: [] };
}

function saveStore(store: { users: StoredUser[]; notifications: StoredNotification[] }) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function createToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 86400 * 1000 * 7 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: any) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: any, statusCode: number, data: any) {
  if (res.headersSent) return;
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

export function createApiServerPlugin(): Plugin {
  const store = loadStore();

  const handleRequest = async (req: any, res: any, next: any) => {
    const url = req.url || "";

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      });
      res.end();
      return;
    }

    // ── 1. Sign Up ───────────────────────────────────────────────────────────
    if (url.startsWith("/v1/auth/signup") && req.method === "POST") {
      const body = await parseJsonBody(req);
      const fullName = (body.fullName || "").trim();
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";

      if (!fullName || fullName.length < 2) {
        return sendJson(res, 400, {
          success: false,
          error: { code: "ERR_VALIDATION", message: "Please enter your name." },
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return sendJson(res, 400, {
          success: false,
          error: { code: "ERR_VALIDATION", message: "Please enter a valid email address." },
        });
      }

      if (!password || password.length < 8) {
        return sendJson(res, 400, {
          success: false,
          error: { code: "ERR_VALIDATION", message: "Password must be at least 8 characters." },
        });
      }

      const existing = store.users.find((u) => u.email === email);
      if (existing) {
        return sendJson(res, 400, {
          success: false,
          error: { code: "ERR_USER_EXISTS", message: "An account with this email already exists." },
        });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = hashPassword(password, salt);
      const newUser: StoredUser = {
        id: `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        fullName,
        email,
        salt,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      store.users.push(newUser);
      saveStore(store);

      return sendJson(res, 201, {
        success: true,
        message: "Account created successfully.",
        data: {
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
        },
      });
    }

    // ── 2. Login ────────────────────────────────────────────────────────────
    if (url.startsWith("/v1/auth/login") && req.method === "POST") {
      const body = await parseJsonBody(req);
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";

      if (!email || !password) {
        return sendJson(res, 400, {
          success: false,
          error: { code: "ERR_VALIDATION", message: "Email and password are required." },
        });
      }

      const user = store.users.find((u) => u.email === email);
      if (!user) {
        return sendJson(res, 401, {
          success: false,
          error: { code: "ERR_INVALID_CREDENTIALS", message: "Invalid email or password." },
        });
      }

      const calculatedHash = hashPassword(password, user.salt);
      if (calculatedHash !== user.passwordHash) {
        return sendJson(res, 401, {
          success: false,
          error: { code: "ERR_INVALID_CREDENTIALS", message: "Invalid email or password." },
        });
      }

      const token = createToken({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: "USER",
      });

      return sendJson(res, 200, {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: "USER",
          },
        },
      });
    }

    // ── 3. Current User Profile ──────────────────────────────────────────────
    if (url.startsWith("/v1/auth/me") && req.method === "GET") {
      const authHeader = req.headers["authorization"] || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const payload = token ? verifyToken(token) : null;

      if (!payload) {
        return sendJson(res, 401, {
          success: false,
          error: { code: "ERR_UNAUTHORIZED", message: "Not authenticated" },
        });
      }

      return sendJson(res, 200, {
        success: true,
        data: {
          id: payload.id,
          fullName: payload.fullName,
          email: payload.email,
          role: payload.role || "USER",
        },
      });
    }

    // ── 4. Notifications Endpoints ───────────────────────────────────────────
    if (url.startsWith("/v1/notifications")) {
      // POST /v1/notifications -> Create/deliver notification
      if (req.method === "POST" && (url === "/v1/notifications" || url === "/v1/notifications/")) {
        const body = await parseJsonBody(req);
        const newNotif: StoredNotification = {
          id: body.id || `notif_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
          userId: body.userId,
          recipientId: body.recipientId ? body.recipientId.toLowerCase() : undefined,
          type: body.type || "SYSTEM",
          title: body.title || "Notification",
          message: body.message || "",
          status: body.status || "UNREAD",
          read: Boolean(body.read),
          amount: body.amount,
          sender: body.sender ? body.sender.toLowerCase() : undefined,
          receiver: body.receiver ? body.receiver.toLowerCase() : undefined,
          channelId: body.channelId,
          transactionHash: body.transactionHash,
          timestamp: body.timestamp || new Date().toISOString(),
        };

        // Avoid exact duplicate notification by txHash and type
        const exists = store.notifications.some(
          (n) => n.transactionHash && n.transactionHash.toLowerCase() === (newNotif.transactionHash || "").toLowerCase() && n.type === newNotif.type
        );
        if (!exists) {
          store.notifications.unshift(newNotif);
          // Keep up to 200 notifications
          if (store.notifications.length > 200) store.notifications.length = 200;
          saveStore(store);
        }

        return sendJson(res, 201, {
          success: true,
          data: newNotif,
        });
      }

      // GET /v1/notifications -> List notifications
      if (req.method === "GET") {
        const parsedUrl = new URL(url, "http://localhost");
        const recipient = parsedUrl.searchParams.get("recipient")?.toLowerCase();
        const userId = parsedUrl.searchParams.get("userId");
        const address = parsedUrl.searchParams.get("address")?.toLowerCase();

        let list = store.notifications;
        if (recipient || address) {
          const target = (recipient || address)!;
          list = list.filter((n) => {
            const matchesRecipient = n.recipientId === target || n.receiver === target;
            const matchesSender = n.sender === target;
            return matchesRecipient || matchesSender;
          });
        } else if (userId) {
          list = list.filter((n) => n.userId === userId);
        }

        return sendJson(res, 200, {
          success: true,
          data: list,
        });
      }

      // POST /v1/notifications/mark-read -> Mark one as read
      if (req.method === "POST" && url.includes("/mark-read")) {
        const body = await parseJsonBody(req);
        const { id } = body;
        store.notifications = store.notifications.map((n) =>
          n.id === id ? { ...n, read: true, status: "READ" } : n
        );
        saveStore(store);
        return sendJson(res, 200, { success: true });
      }

      // POST /v1/notifications/mark-all-read -> Mark all as read
      if (req.method === "POST" && url.includes("/mark-all-read")) {
        const body = await parseJsonBody(req);
        const target = body.address ? body.address.toLowerCase() : undefined;
        store.notifications = store.notifications.map((n) => {
          if (!target || n.recipientId === target || n.receiver === target || n.sender === target) {
            return { ...n, read: true, status: "READ" };
          }
          return n;
        });
        saveStore(store);
        return sendJson(res, 200, { success: true });
      }
    }

    // Pass through to next middleware or proxy
    next();
  };

  return {
    name: "vite-api-server-plugin",
    configureServer(server) {
      server.middlewares.use(handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleRequest);
    },
  };
}
