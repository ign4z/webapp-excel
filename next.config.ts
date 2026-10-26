import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy: solo il nostro dominio + Cloudflare Turnstile sulle pagine pubbliche.
// Tiene fuori script e tracker di terzi aggiunti per sbaglio (che richiederebbero il banner cookie).
// 'unsafe-inline': Next inserisce script inline per l'idratazione e i componenti usano <style> inline.
// In sviluppo servono anche 'unsafe-eval' (React Refresh) e il websocket dell'HMR.
const TURNSTILE = "https://challenges.cloudflare.com";

function csp(extra: { script?: string[]; style?: string[]; img?: string[]; font?: string[]; connect?: string[]; frame?: string[]; worker?: string[] } = {}) {
  const join = (base: string[], more: string[] = []) => [...base, ...more].join(" ");
  return [
    "default-src 'self'",
    `script-src ${join(["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), TURNSTILE], extra.script)}`,
    `style-src ${join(["'self'", "'unsafe-inline'"], extra.style)}`,
    `img-src ${join(["'self'", "data:", "blob:"], extra.img)}`,
    `font-src ${join(["'self'", "data:"], extra.font)}`,
    `connect-src ${join(["'self'", ...(isDev ? ["ws:"] : [])], extra.connect)}`,
    `frame-src ${join([TURNSTILE], extra.frame)}`,
    ...(extra.worker ? [`worker-src ${join(["'self'"], extra.worker)}`] : []),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

// Admin: in più Google Maps JS (autocomplete "+ Aggiungi via" nell'editor strade)
const ADMIN_CSP = csp({
  script: ["https://*.googleapis.com", "https://*.gstatic.com", "https://*.google.com"],
  style: ["https://fonts.googleapis.com"],
  img: ["https://*.googleapis.com", "https://*.gstatic.com", "https://*.google.com", "https://*.googleusercontent.com"],
  font: ["https://fonts.gstatic.com"],
  connect: ["https://*.googleapis.com", "https://*.google.com", "https://*.gstatic.com"],
  frame: ["https://*.google.com"],
  worker: ["blob:"],
});

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp() },
  { key: "Strict-Transport-Security", value: "max-age=63072000" }, // senza includeSubDomains: non vincola altri sottodomini del dominio
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Stessa chiave dopo la regola generale: per /admin vince questa
      { source: "/admin/:path*", headers: [{ key: "Content-Security-Policy", value: ADMIN_CSP }] },
    ];
  },
};

export default nextConfig;
