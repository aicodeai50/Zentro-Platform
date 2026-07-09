export type ApiKeyStatus = "active" | "revoked";
export type ApiKeyMode = "test" | "live";
export type MemberRole = "owner" | "admin" | "developer" | "viewer";
export type ModelStatus = "available" | "beta" | "private";

export const organization = {
  name: "Zentro Labs",
  currentPlan: "Pro",
  usageBalance: "$42.18",
  creditsRemaining: 18450,
  defaultProject: "Production API",
};

export const dashboardMetrics = [
  { label: "Credits remaining", value: "18,450", delta: "+12% vs last month" },
  { label: "API requests this month", value: "1.28M", delta: "+8.4% vs last month" },
  { label: "Token usage", value: "42.7M", delta: "Across all projects" },
  { label: "Active API keys", value: "6", delta: "2 live, 4 test" },
];

export const usageEvents = [
  {
    id: "evt_01",
    time: "Today, 10:42",
    model: "Zentro Reasoning",
    tokens: "18.4K",
    credits: "42",
    status: "Completed",
  },
  {
    id: "evt_02",
    time: "Today, 09:18",
    model: "Zentro Fast",
    tokens: "4.2K",
    credits: "6",
    status: "Completed",
  },
  {
    id: "evt_03",
    time: "Yesterday, 18:01",
    model: "Zentro Coding",
    tokens: "31.8K",
    credits: "58",
    status: "Completed",
  },
  {
    id: "evt_04",
    time: "Yesterday, 15:24",
    model: "Zentro Vision",
    tokens: "9.7K",
    credits: "31",
    status: "Completed",
  },
];

export const apiKeys = [
  {
    id: "key_01",
    name: "Production server",
    prefix: "zlive_prod_8Fa2",
    mode: "live" as ApiKeyMode,
    status: "active" as ApiKeyStatus,
    created: "Jun 12, 2026",
    lastUsed: "2 minutes ago",
  },
  {
    id: "key_02",
    name: "Staging integration",
    prefix: "ztest_stg_K91x",
    mode: "test" as ApiKeyMode,
    status: "active" as ApiKeyStatus,
    created: "Jun 04, 2026",
    lastUsed: "4 hours ago",
  },
  {
    id: "key_03",
    name: "Local dev",
    prefix: "ztest_dev_Qp33",
    mode: "test" as ApiKeyMode,
    status: "revoked" as ApiKeyStatus,
    created: "May 18, 2026",
    lastUsed: "Never",
  },
];

export const usageByDay = [
  { day: "Mon", requests: 152000, credits: 820 },
  { day: "Tue", requests: 188000, credits: 940 },
  { day: "Wed", requests: 174000, credits: 910 },
  { day: "Thu", requests: 221000, credits: 1180 },
  { day: "Fri", requests: 204000, credits: 1020 },
  { day: "Sat", requests: 98000, credits: 470 },
  { day: "Sun", requests: 112000, credits: 520 },
];

export const tokensByModel = [
  { model: "Zentro Fast", tokens: "18.2M", share: 43 },
  { model: "Zentro Reasoning", tokens: "11.4M", share: 27 },
  { model: "Zentro Coding", tokens: "8.1M", share: 19 },
  { model: "Zentro Vision", tokens: "5.0M", share: 11 },
];

export const billingPlans = [
  {
    name: "Free",
    price: "$0",
    description: "Explore Zentro APIs with starter limits.",
    features: ["1 seat", "100K tokens", "Community support"],
  },
  {
    name: "Pro",
    price: "$49",
    description: "Scale production prototypes and internal tools.",
    features: ["5 seats", "50M tokens", "Priority queues"],
  },
  {
    name: "Team",
    price: "$199",
    description: "Collaborate across teams with governance.",
    features: ["25 seats", "250M tokens", "Role controls"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Dedicated capacity, security, and support.",
    features: ["Unlimited seats", "Private models", "SLA support"],
  },
];

export const invoices = [
  { id: "INV-1042", date: "Jul 1, 2026", amount: "$49.00", status: "Paid" },
  { id: "INV-0998", date: "Jun 1, 2026", amount: "$49.00", status: "Paid" },
  { id: "INV-0941", date: "May 1, 2026", amount: "$49.00", status: "Paid" },
];

export const models = [
  {
    name: "Zentro Fast",
    status: "available" as ModelStatus,
    context: "64K",
    price: "1 credit / 1K tokens",
    bestFor: "Low-latency chat, extraction, and routing.",
  },
  {
    name: "Zentro Reasoning",
    status: "available" as ModelStatus,
    context: "128K",
    price: "4 credits / 1K tokens",
    bestFor: "Planning, analysis, and multi-step tasks.",
  },
  {
    name: "Zentro Coding",
    status: "beta" as ModelStatus,
    context: "200K",
    price: "3 credits / 1K tokens",
    bestFor: "Code generation, review, and migrations.",
  },
  {
    name: "Zentro Vision",
    status: "beta" as ModelStatus,
    context: "32K + images",
    price: "5 credits / image request",
    bestFor: "Screenshots, documents, and multimodal workflows.",
  },
  {
    name: "Zentro Private",
    status: "private" as ModelStatus,
    context: "Custom",
    price: "Enterprise contract",
    bestFor: "Dedicated deployments and private fine-tunes.",
  },
];

export const docsSections = [
  {
    title: "Quickstart",
    summary: "Create an API key, install the SDK, and send your first request.",
  },
  {
    title: "Authentication",
    summary: "Use bearer tokens with live or test keys for every API request.",
  },
  {
    title: "Chat completions",
    summary: "Generate responses with Zentro chat-compatible models.",
  },
  {
    title: "Streaming",
    summary: "Stream partial responses for lower perceived latency.",
  },
  {
    title: "Errors",
    summary: "Handle validation, authentication, rate limit, and server errors.",
  },
  {
    title: "Rate limits",
    summary: "Understand request, token, and concurrency limits by plan.",
  },
];

export const teamMembers = [
  { name: "Sandra Lee", email: "sandra@zentro.dev", role: "owner" as MemberRole, status: "Active" },
  { name: "Mika Chen", email: "mika@zentro.dev", role: "admin" as MemberRole, status: "Active" },
  { name: "Jonas Park", email: "jonas@zentro.dev", role: "developer" as MemberRole, status: "Active" },
  { name: "Ava Cole", email: "ava@zentro.dev", role: "viewer" as MemberRole, status: "Invited" },
];

export const settings = {
  organizationName: "Zentro Labs",
  defaultProject: "Production API",
  webhookUrl: "https://api.example.com/zentro/webhook",
  privacy: {
    retainPrompts: false,
    allowTraining: false,
    piiRedaction: true,
  },
};
