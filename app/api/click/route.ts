import { NextResponse } from "next/server";
import { registerClick } from "@/lib/radio-browser";

// The audio engine POSTs here after a stream actually produces audio, and we
// forward the click to Radio Browser server-side (they want a real User-Agent,
// and this is how the directory learns which streams are alive).
export async function POST(request: Request) {
  let uuid: unknown;
  try {
    ({ uuid } = await request.json());
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (typeof uuid !== "string" || !/^[0-9a-f-]{36}$/i.test(uuid)) {
    return NextResponse.json({ error: "bad uuid" }, { status: 400 });
  }
  await registerClick(uuid);
  return NextResponse.json({ ok: true });
}
