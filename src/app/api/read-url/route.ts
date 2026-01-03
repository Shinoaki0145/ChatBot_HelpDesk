import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
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
    $(
      "script, style, nav, footer, header, noscript, iframe, aside, .ads, .sidebar, .menu, .cookie-banner, #footer, #header"
    ).remove();

    let contentArea = $("main");
    if (contentArea.length === 0) contentArea = $("article");
    if (contentArea.length === 0) contentArea = $("[role='main']");
    if (contentArea.length === 0) contentArea = $(".content, #content, .main");
    if (contentArea.length === 0) contentArea = $("body");

    const paragraphs: string[] = [];

    // 1. Thêm 'tr' (table row) vào danh sách cần tìm kiếm
    contentArea.find("h1, h2, h3, p, li, tr").each((_, el) => {
      const $el = $(el);

      // 2. Xử lý đặc biệt cho bảng (Table Row)
      if ($el.is("tr")) {
        // Tìm các ô (td) hoặc tiêu đề bảng (th) trong hàng hiện tại
        const cells = $el
          .find("td, th")
          .map((__, cell) => $(cell).text().trim().replace(/\s+/g, " ")) // Xóa xuống dòng thừa và khoảng trắng kép
          .get();

        // Ghép các ô lại với nhau bằng dấu gạch đứng "|" (định dạng giả Markdown)
        // Ví dụ: | 1 tháng 1 | 1 | Tết Dương Lịch |
        if (cells.length > 0) {
          paragraphs.push(`| ${cells.join(" | ")} |`);
        }
        return; // Xong phần xử lý cho tr, bỏ qua đoạn code phía dưới
      }

      // 3. Xử lý cho các thẻ văn bản thông thường (h1, p, li)
      const text = $el.text().trim();

      // Giữ nguyên logic lọc độ dài, NHƯNG lưu ý:
      // Table row đã được push ở trên nên không bị ảnh hưởng bởi check này.
      // Với text thường, nếu quá ngắn có thể là rác, nên giữ check > 25 (hoặc giảm xuống tùy nhu cầu)
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
