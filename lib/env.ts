import { z } from "zod"

// Treat empty strings as undefined so `.optional()` fields don't fail when
// `.env.local` has placeholders like `FOO=` copied from `.env.example`.
const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema)

const optStr = (min = 1) => emptyToUndefined(z.string().min(min).optional())
const optUrl = () => emptyToUndefined(z.string().url().optional())
const optEmail = () => emptyToUndefined(z.string().email().optional())

const ServerEnvSchema = z.object({
  FIREBASE_PROJECT_ID: optStr(),
  FIREBASE_CLIENT_EMAIL: optEmail(),
  FIREBASE_PRIVATE_KEY: optStr(),
  GOOGLE_APPLICATION_CREDENTIALS: optStr(),

  HYSTERIA_BIN: optStr(),
  HYSTERIA_WORK_DIR: optStr(),
  HYSTERIA_DOWNLOAD_BASE_URL: z
    .string()
    .url()
    .default("https://github.com/apernet/hysteria/releases/download"),

  HYSTERIA_AUTH_BACKEND_SECRET: emptyToUndefined(z.string().min(16).optional()),
  HYSTERIA_TRAFFIC_API_BASE_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:25000"),
  HYSTERIA_TRAFFIC_API_SECRET: optStr(),

  NODE_ID: z.string().min(1).default("default"),

  NEXT_PUBLIC_FIREBASE_API_KEY: optStr(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optStr(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optStr(),
  NEXT_PUBLIC_FIREBASE_APP_ID: optStr(),

  SESSION_COOKIE_NAME: z.string().min(1).default("__session"),
  SESSION_COOKIE_MAX_AGE_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24 * 14)
    .default(60 * 60 * 24 * 5),

  HYSTERIA_EGRESS_PROXY_URL: emptyToUndefined(
    z
      .string()
      .regex(/^(https?|socks5h?):\/\/.+/, "must be http(s):// or socks5(h):// URL")
      .optional()
  ),

  LLM_PROVIDER_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  LLM_PROVIDER_API_KEY: optStr(),
  LLM_MODEL: z.string().min(1).default("gpt-4o-mini"),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),

  AGENT_MAX_STEPS: z.coerce.number().int().min(1).max(100).default(20),
  AGENT_MAX_CONCURRENCY_PER_DOMAIN: z.coerce.number().int().min(1).max(32).default(2),
  AGENT_TASK_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(30 * 60 * 1000)
    .default(5 * 60 * 1000),
})

export type ServerEnv = z.infer<typeof ServerEnvSchema>

let cached: ServerEnv | null = null

export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = ServerEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    )
  }
  cached = parsed.data
  return cached
}
