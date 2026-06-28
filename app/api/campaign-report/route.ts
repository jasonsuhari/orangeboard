import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import {
  makeCampaignReport,
  makeSampleCampaignReport,
  renderCampaignReportHtml,
  type CampaignReportInput,
} from "../../lib/campaignReport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function exportFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "campaign-package"}.pdf`;
}

async function renderPdf(html: string): Promise<ArrayBuffer> {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  } finally {
    await browser.close();
  }
}

function wantsFormat(req: NextRequest): "json" | "html" | "pdf" {
  const format = req.nextUrl.searchParams.get("format");
  if (format === "pdf" || format === "html") return format;
  if (req.headers.get("accept")?.includes("application/pdf")) return "pdf";
  return "json";
}

async function respondWithReport(req: NextRequest, input: CampaignReportInput) {
  const report = makeCampaignReport(input);
  const format = wantsFormat(req);

  if (format === "html") {
    return new NextResponse(renderCampaignReportHtml(report), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "pdf") {
    try {
      const pdf = await renderPdf(renderCampaignReportHtml(report));
      return new NextResponse(pdf as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${exportFilename(report.campaignName)}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("[campaign-report:pdf]", err);
      return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ report });
}

export async function GET(req: NextRequest) {
  const sample = makeSampleCampaignReport();
  const format = wantsFormat(req);

  if (format === "html") {
    return new NextResponse(renderCampaignReportHtml(sample), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (format === "pdf") {
    try {
      const pdf = await renderPdf(renderCampaignReportHtml(sample));
      return new NextResponse(pdf as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${exportFilename(sample.campaignName)}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("[campaign-report:sample-pdf]", err);
      return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ report: sample });
}

export async function POST(req: NextRequest) {
  let input: CampaignReportInput;
  try {
    input = (await req.json()) as CampaignReportInput;
    if (!input?.brief?.identity?.companyName || !input?.opportunity?.title) {
      return NextResponse.json(
        { error: "Missing required brief or opportunity fields" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  return respondWithReport(req, input);
}
