import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "Missing url" },
        { status: 400 }
      );
    }

    // fetch HTML
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch website" },
        { status: 500 }
      );
    }

    const html = await res.text();  

    // parse HTML → text
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, noscript").remove();

    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    return NextResponse.json({
      url,
      text: text.slice(0, 100000), // giới hạn token cho LLM
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
