/** Inline print stylesheet for the campaign package report. Interpolated into
 *  the `<style>` tag by renderCampaignReportHtml — indentation matters for the
 *  emitted HTML, so keep the 4-space lines as-is. */
export const REPORT_STYLES = `    @page { size: Letter; margin: 0.35in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f0e8;
      color: #111111;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.35;
    }
    a { color: #c2410c; text-decoration: none; word-break: break-all; }
    .doc { max-width: 8.5in; margin: 0 auto; }
    .sheet {
      min-height: 10.3in;
      padding: 0.16in 0.08in 0.04in;
      break-after: page;
    }
    .sheet:last-child { break-after: auto; }
    .hero {
      overflow: hidden;
      border: 1px solid #1f1f1f;
      border-radius: 22px;
      background: #0f1115;
      color: #ffffff;
      box-shadow: 0 24px 60px rgba(17, 17, 17, 0.18);
    }
    .hero-top {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      min-height: 390px;
    }
    .hero-copy {
      padding: 34px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background:
        linear-gradient(135deg, rgba(249, 115, 22, 0.2), transparent 45%),
        #111111;
    }
    .eyebrow, .stage {
      color: #f97316;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    h1 {
      margin: 12px 0 0;
      font-size: 40px;
      line-height: 0.95;
      letter-spacing: 0;
    }
    .hero-copy p { color: rgba(255, 255, 255, 0.74); font-size: 13px; }
    .report-id { color: rgba(255, 255, 255, 0.48); font-size: 11px; }
    .mockup-wrap {
      padding: 34px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0)),
        radial-gradient(circle at 90% 10%, rgba(249,115,22,0.28), transparent 34%);
    }
    .mockup-frame {
      border-radius: 16px;
      padding: 16px 16px 34px;
      background: linear-gradient(180deg, #2a2a2a, #151515);
      box-shadow: 0 18px 36px rgba(0,0,0,0.38);
      position: relative;
    }
    .mockup-frame:before, .mockup-frame:after {
      content: "";
      position: absolute;
      bottom: -78px;
      width: 16px;
      height: 80px;
      background: #2d2d2d;
    }
    .mockup-frame:before { left: 26%; }
    .mockup-frame:after { right: 26%; }
    .mockup-frame img {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 10px;
      background: #f97316;
    }
    .mockup-caption {
      margin-top: 14px;
      color: rgba(255,255,255,0.7);
      font-size: 12px;
    }
    .hero-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-top: 1px solid rgba(255,255,255,0.12);
    }
    .hero-stats div { padding: 18px 22px; border-right: 1px solid rgba(255,255,255,0.12); }
    .hero-stats div:last-child { border-right: 0; }
    .hero-stats span { color: rgba(255,255,255,0.45); display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
    .hero-stats strong { display: block; margin-top: 6px; font-size: 22px; }
    .grid { display: grid; gap: 16px; }
    .grid-two { grid-template-columns: 1.1fr 0.9fr; }
    .panel {
      border: 1px solid #ded8ce;
      border-radius: 16px;
      background: rgba(255,255,255,0.88);
      padding: 20px;
      box-shadow: 0 12px 30px rgba(44, 39, 32, 0.06);
    }
    .panel.dark { background: #111111; color: #ffffff; border-color: #111111; }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
      letter-spacing: 0;
    }
    h3 { margin: 0; font-size: 15px; }
    p { margin: 0; }
    .summary {
      margin-top: 10px;
      color: #4f4a44;
      font-size: 13px;
    }
    .recommendation {
      padding: 16px;
      border-radius: 12px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      font-size: 13px;
      color: #43230b;
    }
    .pill-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
    .pill-row span {
      border-radius: 999px;
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      padding: 5px 8px;
      color: #3f3f46;
      font-size: 10px;
      font-weight: 700;
    }
    .placement-grid { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 16px; }
    .map-card {
      min-height: 240px;
      border-radius: 14px;
      background:
        linear-gradient(90deg, transparent 0 46%, rgba(255,255,255,0.65) 46% 53%, transparent 53%),
        linear-gradient(22deg, transparent 0 42%, rgba(255,255,255,0.7) 42% 49%, transparent 49%),
        linear-gradient(155deg, transparent 0 54%, rgba(255,255,255,0.58) 54% 60%, transparent 60%),
        #dfe5dc;
      border: 1px solid #cbd5c0;
      position: relative;
      overflow: hidden;
    }
    .map-card:after {
      content: "";
      position: absolute;
      left: 50%;
      top: 48%;
      width: 88px;
      height: 56px;
      transform: translate(-50%, -50%) rotate(-8deg);
      border-radius: 52% 48% 57% 43%;
      background: rgba(249,115,22,0.28);
      border: 1px solid rgba(249,115,22,0.7);
      box-shadow: 0 0 0 16px rgba(249,115,22,0.08);
    }
    .pin {
      position: absolute;
      left: 50%;
      top: 48%;
      transform: translate(-50%, -50%);
      z-index: 2;
      border-radius: 999px;
      background: #f97316;
      color: white;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 900;
      border: 3px solid white;
      box-shadow: 0 10px 22px rgba(0,0,0,0.2);
    }
    .fact-list { display: grid; gap: 8px; margin-top: 12px; }
    .fact-list div {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 10px;
      padding: 9px 0;
      border-bottom: 1px solid #ece7df;
      font-size: 12px;
    }
    .fact-list span { color: #706b65; }
    ul.clean { margin: 12px 0 0; padding: 0 0 0 18px; color: #4f4a44; font-size: 12px; }
    ul.clean li { margin-bottom: 6px; }
    .dark ul.clean { color: rgba(255,255,255,0.78); }
    .metric-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .metric-card {
      border: 1px solid #e3ded6;
      border-radius: 14px;
      background: #ffffff;
      padding: 12px;
      min-height: 126px;
    }
    .metric-card span { color: #6b6258; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .metric-card strong { display: block; margin-top: 8px; font-size: 23px; color: #111111; }
    .metric-card p { margin-top: 8px; color: #5c5650; font-size: 10.5px; }
    .agent-report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .agent-report-card {
      break-inside: avoid;
      border: 1px solid #e3ded6;
      border-radius: 16px;
      background: #ffffff;
      overflow: hidden;
    }
    .agent-report-media {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      background: #f4f4f5;
      border-bottom: 1px solid #ece7df;
    }
    .agent-report-body { padding: 14px; display: grid; gap: 8px; }
    .agent-report-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .agent-report-head small { color: #706b65; font-size: 10px; text-align: right; max-width: 42%; }
    .agent-context { color: #706b65; font-size: 10.5px; }
    .agent-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .agent-stats span { border-radius: 10px; background: #f7f4ef; padding: 7px; color: #706b65; font-size: 9px; text-transform: uppercase; font-weight: 800; }
    .agent-stats strong { display: block; margin-top: 2px; color: #111111; font-size: 13px; }
    .agent-report-body p { color: #3d3935; font-size: 11px; }
    .agent-report-body blockquote { margin: 0; border-left: 3px solid #f97316; padding-left: 10px; color: #4f4a44; font-size: 11px; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid #e3ded6;
      background: white;
      font-size: 11px;
    }
    th {
      background: #111111;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    td {
      border-top: 1px solid #ece7df;
      padding: 10px;
      vertical-align: top;
      color: #3d3935;
    }
    td strong { display: block; color: #111111; font-size: 12px; }
    td small { display: block; margin-top: 2px; color: #766f68; }
    .priority {
      display: inline-grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      color: white;
    }
    .priority-a { background: #f97316; }
    .priority-b { background: #2563eb; }
    .priority-c { background: #52525b; }
    .email-grid { display: grid; gap: 14px; }
    .email-card {
      break-inside: avoid;
      border: 1px solid #e3ded6;
      border-radius: 16px;
      background: #ffffff;
      padding: 16px;
    }
    .email-card > div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    .timing { color: #706b65; font-size: 10px; font-weight: 700; }
    .preview { margin-top: 5px; color: #706b65; font-size: 11px; }
    pre {
      margin: 12px 0 0;
      white-space: pre-wrap;
      font-family: inherit;
      color: #2b2926;
      font-size: 11.5px;
      line-height: 1.42;
    }
    .cta {
      margin-top: 12px;
      padding: 8px 10px;
      border-radius: 10px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 11px;
      font-weight: 800;
    }
    .proof-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; list-style: none; margin: 0; padding: 0; }
    .proof-list li { border: 1px solid #e3ded6; border-radius: 12px; padding: 12px; background: white; }
    .proof-list strong { display: block; font-size: 12px; }
    .proof-list span { display: inline-block; margin-top: 5px; color: #047857; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .proof-list p { margin-top: 6px; color: #5f5952; font-size: 10.5px; }
    .footer-note { margin-top: 12px; color: #746c63; font-size: 10px; }`;
