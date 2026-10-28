import { IP_CHECK_URL } from "../shared/constants";

export async function getPublicIp(): Promise<string | undefined> {
  try {
    const res = await fetch(IP_CHECK_URL, { cache: "no-store" });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { ip?: string };
    return data.ip;
  } catch {
    return undefined;
  }
}
