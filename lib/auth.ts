// A single studio passcode keeps the projects private on the public web.
export const COOKIE = "pg_pass";

export async function passHash(pass: string) {
  const data = new TextEncoder().encode(`pick-glass:${pass}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
