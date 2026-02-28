"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/_core/index.ts
var import_express = __toESM(require("express"));
var import_http = require("http");
var import_net = __toESM(require("net"));
var import_express2 = require("@trpc/server/adapters/express");

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
var import_drizzle_orm = require("drizzle-orm");
var import_mysql2 = require("drizzle-orm/mysql2");

// drizzle/schema.ts
var import_mysql_core = require("drizzle-orm/mysql-core");
var users = (0, import_mysql_core.mysqlTable)("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: (0, import_mysql_core.varchar)("openId", { length: 64 }).notNull().unique(),
  name: (0, import_mysql_core.text)("name"),
  email: (0, import_mysql_core.varchar)("email", { length: 320 }),
  loginMethod: (0, import_mysql_core.varchar)("loginMethod", { length: 64 }),
  role: (0, import_mysql_core.mysqlEnum)("role", ["user", "admin"]).default("user").notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: (0, import_mysql_core.timestamp)("lastSignedIn").defaultNow().notNull()
});
var devices = (0, import_mysql_core.mysqlTable)("devices", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  /** Identifiant unique de l'appareil (androidId ou idfv iOS) */
  deviceId: (0, import_mysql_core.varchar)("deviceId", { length: 255 }).notNull().unique(),
  /** Nombre total de recherches effectuées sur cet appareil */
  searchCount: (0, import_mysql_core.int)("searchCount").default(0).notNull(),
  /** L'appareil a-t-il un abonnement Premium actif ? */
  isPremium: (0, import_mysql_core.boolean)("isPremium").default(false).notNull(),
  /** Première utilisation de l'app sur cet appareil */
  firstSeen: (0, import_mysql_core.timestamp)("firstSeen").defaultNow().notNull(),
  /** Dernière synchronisation avec le serveur */
  lastSeen: (0, import_mysql_core.timestamp)("lastSeen").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = (0, import_mysql2.drizzle)(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function syncDevice(deviceId, isPremium) {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.insert(devices).values({ deviceId, isPremium, searchCount: 0 }).onDuplicateKeyUpdate({ set: { isPremium, lastSeen: /* @__PURE__ */ new Date() } });
    const result = await db.select().from(devices).where((0, import_drizzle_orm.eq)(devices.deviceId, deviceId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] syncDevice error:", error);
    return null;
  }
}
async function incrementDeviceSearch(deviceId, limit) {
  const db = await getDb();
  if (!db) return { allowed: true, searchCount: 0 };
  try {
    const result = await db.select().from(devices).where((0, import_drizzle_orm.eq)(devices.deviceId, deviceId)).limit(1);
    if (result.length === 0) {
      await db.insert(devices).values({ deviceId, searchCount: 1, isPremium: false });
      return { allowed: true, searchCount: 1 };
    }
    const device = result[0];
    if (device.isPremium) {
      await db.update(devices).set({ searchCount: device.searchCount + 1 }).where((0, import_drizzle_orm.eq)(devices.deviceId, deviceId));
      return { allowed: true, searchCount: device.searchCount + 1 };
    }
    if (device.searchCount >= limit) {
      return { allowed: false, searchCount: device.searchCount };
    }
    const newCount = device.searchCount + 1;
    await db.update(devices).set({ searchCount: newCount }).where((0, import_drizzle_orm.eq)(devices.deviceId, deviceId));
    return { allowed: true, searchCount: newCount };
  } catch (error) {
    console.error("[Database] incrementDeviceSearch error:", error);
    return { allowed: true, searchCount: 0 };
  }
}

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isIpAddress(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getParentDomain(hostname) {
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return void 0;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) {
    return void 0;
  }
  return "." + parts.slice(-2).join(".");
}
function getSessionCookieOptions(req) {
  const hostname = req.hostname;
  const domain = getParentDomain(hostname);
  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
var import_axios = __toESM(require("axios"));
var import_cookie = require("cookie");
var import_jose = require("jose");
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(GET_USER_INFO_PATH, {
      accessToken: token.accessToken
    });
    return data;
  }
};
var createOAuthHttpClient = () => import_axios.default.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(platforms.filter((p) => typeof p === "string"));
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = (0, import_cookie.parse)(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new import_jose.SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await (0, import_jose.jwtVerify)(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = token || cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
async function syncUser(userInfo) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }
  const lastSignedIn = /* @__PURE__ */ new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return saved ?? {
    openId: userInfo.openId,
    name: userInfo.name,
    email: userInfo.email,
    loginMethod: userInfo.loginMethod ?? null,
    lastSignedIn
  };
}
function buildUserResponse(user) {
  return {
    id: user?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? /* @__PURE__ */ new Date()).toISOString()
  };
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const frontendUrl = process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
  app.get("/api/oauth/mobile", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user)
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
  app.post("/api/auth/session", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}

// server/routers.ts
var import_zod2 = require("zod");

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    budget_tokens: 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`);
  }
  return await response.json();
}

// server/_core/systemRouter.ts
var import_zod = require("zod");

// server/_core/notification.ts
var import_server = require("@trpc/server");
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("webdevtoken.v1.WebDevService/SendNotification", normalizedBase).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new import_server.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new import_server.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
var import_server2 = require("@trpc/server");
var import_superjson = __toESM(require("superjson"));
var t = import_server2.initTRPC.context().create({
  transformer: import_superjson.default
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new import_server2.TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new import_server2.TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    import_zod.z.object({
      timestamp: import_zod.z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    import_zod.z.object({
      title: import_zod.z.string().min(1, "title is required"),
      content: import_zod.z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var FREE_SEARCH_LIMIT = 15;
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // Root analyzeLabel endpoint (for compatibility with label-scanner)
  analyzeLabel: publicProcedure.input(
    import_zod2.z.object({
      imageUrl: import_zod2.z.string().url()
    })
  ).mutation(async ({ input }) => {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Tu es un expert en analyse d'\xE9tiquettes de produits phytosanitaires fran\xE7ais.

Ta mission : extraire EXACTEMENT les informations telles qu'elles apparaissent sur l'\xE9tiquette.

INFORMATIONS \xC0 EXTRAIRE :

1. **Nom commercial** (OBLIGATOIRE) :
   - C'est le nom de marque du produit, g\xE9n\xE9ralement en GROS caract\xE8res en haut de l'\xE9tiquette
   - Copie-le EXACTEMENT comme il est \xE9crit (majuscules, minuscules, espaces, tirets, apostrophes)
   - Exemples : "ROUNDUP ULTRA", "Glyphos 360", "CALYPSO SC 480", "CINCH PRO"
   - ATTENTION : Ne confonds PAS les lettres similaires :
     * C et N sont diff\xE9rents
     * I et l (L minuscule) sont diff\xE9rents
     * O et 0 (z\xE9ro) sont diff\xE9rents
   - V\xE9rifie lettre par lettre avant de r\xE9pondre

2. **Num\xE9ro AMM** (OBLIGATOIRE) :
   - Format : EXACTEMENT 7 chiffres (exemple : 2150918, 8800006, 9800336)
   - Cherche "AMM" ou "N\xB0 AMM" ou "Autorisation de Mise sur le March\xE9" sur l'\xE9tiquette
   - Le num\xE9ro AMM est g\xE9n\xE9ralement pr\xE8s du bas de l'\xE9tiquette ou dans une section "Informations r\xE9glementaires"
   - V\xE9rifie chaque chiffre individuellement (0 vs O, 1 vs I, 2 vs Z, 5 vs S, 8 vs B)
   - Si tu ne trouves pas de num\xE9ro \xE0 7 chiffres, mets ""
   - IMPORTANT : Ne confonds PAS le num\xE9ro AMM avec d'autres num\xE9ros (lot, code-barres, etc.)

R\xC9PONSE ATTENDUE (JSON) :
{
  "productName": "NOM EXACT DU PRODUIT",
  "amm": "7 chiffres ou cha\xEEne vide",
  "function": "Type de produit (herbicide, fongicide, insecticide, etc.) si visible"
}

ATTENTION :
- Ne modifie JAMAIS le nom commercial (pas de correction, pas de traduction)
- Si l'\xE9tiquette est floue ou illisible, mets "" pour les champs concern\xE9s
- Sois pr\xE9cis et exact
- V\xE9rifie chaque lettre et chaque chiffre individuellement
- Pour les lettres : \xE9vite les confusions (C vs N, I vs l, O vs 0)
- Pour les chiffres de l'AMM : v\xE9rifie deux fois (0 vs O, 1 vs I, 2 vs Z, 5 vs S, 8 vs B, 9 vs g)
- Le num\xE9ro AMM doit \xEAtre coh\xE9rent avec le nom du produit`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse cette \xE9tiquette de produit phytosanitaire et extrait le nom commercial, le num\xE9ro AMM et la fonction."
              },
              {
                type: "image_url",
                image_url: {
                  url: input.imageUrl
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });
      const messageContent = response.choices?.[0]?.message?.content;
      let content = typeof messageContent === "string" ? messageContent : "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      content = content.replace(/<[^>]*>/g, "").replace(/[™®©]/g, "").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-");
      try {
        const parsed = JSON.parse(content);
        const cleanProductName = (parsed.productName || parsed.nom || "").replace(/[^\w\s\-]/g, " ").replace(/\s+/g, " ").trim();
        return {
          success: true,
          data: {
            productName: cleanProductName,
            amm: parsed.amm || "",
            function: parsed.function || ""
          },
          raw: content
        };
      } catch (parseError) {
        console.error("[analyzeLabel] JSON parse error:", parseError.message, "Content:", content);
        const jsonMatch = content.match(/\{[^}]+\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            const cleanProductName = (parsed.productName || parsed.nom || "").replace(/[^\w\s\-]/g, " ").replace(/\s+/g, " ").trim();
            return {
              success: true,
              data: {
                productName: cleanProductName,
                amm: parsed.amm || "",
                function: parsed.function || ""
              },
              raw: content
            };
          } catch {
          }
        }
        return {
          success: false,
          data: { productName: "", amm: "", function: "" },
          error: `Failed to parse response: ${parseError.message}`,
          raw: content
        };
      }
    } catch (error) {
      console.error("[analyzeLabel] Error analyzing label:", error?.message || error);
      return {
        success: false,
        data: { productName: "", amm: "", function: "" },
        error: error?.message || "Unknown error",
        raw: error?.message || "Unknown error"
      };
    }
  }),
  // OCR route for scanning product labels
  ocr: router({
    analyzeLabel: publicProcedure.input(
      import_zod2.z.object({
        imageUrl: import_zod2.z.string().url()
      })
    ).mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Tu es un expert en analyse d'\xE9tiquettes de produits phytosanitaires fran\xE7ais.

Ta mission : extraire EXACTEMENT les informations telles qu'elles apparaissent sur l'\xE9tiquette.

INFORMATIONS \xC0 EXTRAIRE :

1. **Nom commercial** (OBLIGATOIRE) :
   - C'est le nom de marque du produit, g\xE9n\xE9ralement en GROS caract\xE8res en haut de l'\xE9tiquette
   - Copie-le EXACTEMENT comme il est \xE9crit (majuscules, minuscules, espaces, tirets, apostrophes)
   - Exemples : "ROUNDUP ULTRA", "Glyphos 360", "CALYPSO SC 480", "CINCH PRO"
   - ATTENTION : Ne confonds PAS les lettres similaires :
     * C et N sont diff\xE9rents
     * I et l (L minuscule) sont diff\xE9rents
     * O et 0 (z\xE9ro) sont diff\xE9rents
   - V\xE9rifie lettre par lettre avant de r\xE9pondre

2. **Num\xE9ro AMM** (OBLIGATOIRE) :
   - Format : EXACTEMENT 7 chiffres (exemple : 2150918, 8800006, 9800336)
   - Cherche "AMM" ou "N\xB0 AMM" ou "Autorisation de Mise sur le March\xE9" sur l'\xE9tiquette
   - Le num\xE9ro AMM est g\xE9n\xE9ralement pr\xE8s du bas de l'\xE9tiquette ou dans une section "Informations r\xE9glementaires"
   - V\xE9rifie chaque chiffre individuellement (0 vs O, 1 vs I, 2 vs Z, 5 vs S, 8 vs B)
   - Si tu ne trouves pas de num\xE9ro \xE0 7 chiffres, mets ""
   - IMPORTANT : Ne confonds PAS le num\xE9ro AMM avec d'autres num\xE9ros (lot, code-barres, etc.)

R\xC9PONSE ATTENDUE (JSON) :
{
  "nom": "NOM EXACT DU PRODUIT",
  "amm": "7 chiffres ou cha\xEEne vide"
}

ATTENTION :
- Ne modifie JAMAIS le nom commercial (pas de correction, pas de traduction)
- Si l'\xE9tiquette est floue ou illisible, mets "" pour les champs concern\xE9s
- Sois pr\xE9cis et exact
- V\xE9rifie chaque lettre et chaque chiffre individuellement
- Pour les lettres : \xE9vite les confusions (C vs N, I vs l, O vs 0)
- Pour les chiffres de l'AMM : v\xE9rifie deux fois (0 vs O, 1 vs I, 2 vs Z, 5 vs S, 8 vs B, 9 vs g)
- Le num\xE9ro AMM doit \xEAtre coh\xE9rent avec le nom du produit`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyse cette \xE9tiquette de produit phytosanitaire et extrait le nom commercial et le num\xE9ro AMM."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: input.imageUrl
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        });
        const messageContent = response.choices?.[0]?.message?.content;
        const content = typeof messageContent === "string" ? messageContent : "";
        try {
          const parsed = JSON.parse(content);
          return {
            success: true,
            nom: parsed.nom || "",
            amm: parsed.amm || "",
            raw: content
          };
        } catch {
          const jsonMatch = content.match(/\{[^}]+\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              success: true,
              nom: parsed.nom || "",
              amm: parsed.amm || "",
              raw: content
            };
          }
          return {
            success: false,
            nom: "",
            amm: "",
            raw: content
          };
        }
      } catch (error) {
        console.error("[OCR] Error analyzing label:", error?.message || error);
        return {
          success: false,
          nom: "",
          amm: "",
          raw: error?.message || "Unknown error"
        };
      }
    })
  }),
  // ─── Device tracking endpoints ─────────────────────────────────────────────
  device: router({
    /**
     * Synchronise l'appareil au démarrage de l'app.
     * Crée l'entrée si absente, met à jour isPremium.
     * Retourne { searchCount, isPremium }.
     */
    sync: publicProcedure.input(
      import_zod2.z.object({
        deviceId: import_zod2.z.string().min(1).max(255),
        isPremium: import_zod2.z.boolean()
      })
    ).mutation(async ({ input }) => {
      const device = await syncDevice(input.deviceId, input.isPremium);
      if (!device) {
        return { searchCount: 0, isPremium: input.isPremium, offline: true };
      }
      return {
        searchCount: device.searchCount,
        isPremium: device.isPremium,
        offline: false
      };
    }),
    /**
     * Incrémente le compteur de recherche côté serveur.
     * Retourne { allowed, searchCount }.
     * Si allowed = false, l'app doit bloquer la recherche et proposer Premium.
     */
    incrementSearch: publicProcedure.input(
      import_zod2.z.object({
        deviceId: import_zod2.z.string().min(1).max(255),
        isPremium: import_zod2.z.boolean()
      })
    ).mutation(async ({ input }) => {
      if (input.isPremium) {
        return { allowed: true, searchCount: -1 };
      }
      const result = await incrementDeviceSearch(input.deviceId, FREE_SEARCH_LIMIT);
      return result;
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = import_net.default.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = (0, import_express.default)();
  const server = (0, import_http.createServer)(app);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });
  app.use(
    "/api/trpc",
    (0, import_express2.createExpressMiddleware)({
      router: appRouter,
      createContext
    })
  );
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}
startServer().catch(console.error);
