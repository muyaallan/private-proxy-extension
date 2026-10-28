import { IP_CHECK_URL } from "../shared/constants";
import type { GeoInfo } from "../shared/types";

export type IpCheckResult =
  | { ok: true; ip: string; geo: GeoInfo }
  | { ok: false; error: string };

export async function checkPublicIp(): Promise<IpCheckResult> {
  try {
    const res = await fetch(IP_CHECK_URL, { cache: "no-store" });
    if (!res.ok) return { ok: false, error: `IP check HTTP ${res.status}` };
    const data = await res.json();
    
    if (data.status === "fail") {
      return { ok: false, error: data.message || "IP check failed" };
    }

    return {
      ok: true,
      ip: data.query,
      geo: {
        country: data.country,
        city: data.city,
        timezone: data.timezone,
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
