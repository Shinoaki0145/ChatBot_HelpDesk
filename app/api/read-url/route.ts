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
    $("script, style, nav, footer, header, noscript, iframe, aside, .ads, .sidebar, .menu, .cookie-banner, #footer, #header").remove();

    let contentArea = $("main");

    if (contentArea.length === 0) contentArea = $("article");
    if (contentArea.length === 0) contentArea = $("[role='main']");
    if (contentArea.length === 0) contentArea = $(".content, #content, .main");
    if (contentArea.length === 0) contentArea = $("body");

    const paragraphs: string[] = [];

    contentArea.find("h1, h2, h3, p, li").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 25) { 
        paragraphs.push(text);
      }
    });

    const cleanText = paragraphs.join("\n\n");

    return NextResponse.json({
      url,
      text: cleanText.slice(0, 100000), // giới hạn token cho LLM
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
