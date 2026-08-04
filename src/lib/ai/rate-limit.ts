export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  reason?: string;
};

type Bucket = {
  dayKey: string;
  hourKey: string;
  dayCount: number;
  hourCount: number;
};

const globalStore = globalThis as typeof globalThis & {
  __aiRateLimitStore?: Map<string, Bucket>;
};

function store(): Map<string, Bucket> {
  if (!globalStore.__aiRateLimitStore) {
    globalStore.__aiRateLimitStore = new Map();
  }
  return globalStore.__aiRateLimitStore;
}

function tokyoDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function tokyoHourKey(now = new Date()): string {
  const day = tokyoDayKey(now);
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return `${day}T${hour}`;
}

export function getAiRateLimits() {
  const daily = Number(process.env.AI_DAILY_LIMIT_PER_IP ?? "10");
  const hourly = Number(process.env.AI_HOURLY_LIMIT_PER_IP ?? "5");
  return {
    daily: Number.isFinite(daily) && daily > 0 ? daily : 10,
    hourly: Number.isFinite(hourly) && hourly > 0 ? hourly : 5,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function hashIp(ip: string): string {
  // Simple non-crypto hash (enough for rate-limit keys).
  let h = 2166136261;
  for (let i = 0; i < ip.length; i += 1) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function getBucket(ipHash: string): Bucket {
  const dayKey = tokyoDayKey();
  const hourKey = tokyoHourKey();
  const map = store();
  const current = map.get(ipHash);
  if (!current || current.dayKey !== dayKey) {
    const fresh: Bucket = { dayKey, hourKey, dayCount: 0, hourCount: 0 };
    map.set(ipHash, fresh);
    return fresh;
  }
  if (current.hourKey !== hourKey) {
    current.hourKey = hourKey;
    current.hourCount = 0;
  }
  return current;
}

export function checkAiRateLimit(ip: string): RateLimitResult {
  const { daily, hourly } = getAiRateLimits();
  const bucket = getBucket(hashIp(ip));
  const remainingDay = Math.max(0, daily - bucket.dayCount);
  const remainingHour = Math.max(0, hourly - bucket.hourCount);
  const remaining = Math.min(remainingDay, remainingHour);

  if (bucket.dayCount >= daily) {
    return {
      allowed: false,
      limit: daily,
      remaining: 0,
      resetAt: `${bucket.dayKey}T15:00:00.000Z`,
      reason: `本日の無料枠（${daily}回/日）を使い切りました。明日またご利用ください。`,
    };
  }
  if (bucket.hourCount >= hourly) {
    return {
      allowed: false,
      limit: hourly,
      remaining: 0,
      resetAt: bucket.hourKey,
      reason: `短時間の利用上限（${hourly}回/時）に達しました。しばらくしてからお試しください。`,
    };
  }

  return {
    allowed: true,
    limit: daily,
    remaining,
    resetAt: `${bucket.dayKey}T15:00:00.000Z`,
  };
}

export function consumeAiRateLimit(ip: string): RateLimitResult {
  const checked = checkAiRateLimit(ip);
  if (!checked.allowed) return checked;

  const bucket = getBucket(hashIp(ip));
  bucket.dayCount += 1;
  bucket.hourCount += 1;

  const { daily, hourly } = getAiRateLimits();
  const remaining = Math.min(
    Math.max(0, daily - bucket.dayCount),
    Math.max(0, hourly - bucket.hourCount),
  );

  return {
    allowed: true,
    limit: daily,
    remaining,
    resetAt: checked.resetAt,
  };
}
