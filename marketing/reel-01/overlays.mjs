import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire("/home/user/palm-ai/package.json")("playwright");
const font = (f) =>
  "data:font/woff2;base64," +
  readFileSync("/home/user/palm-ai/marketing/fonts/package/files/" + f).toString("base64");
const css = `
@font-face{font-family:Deva;font-weight:700;src:url(${font("noto-sans-devanagari-devanagari-700-normal.woff2")})}
@font-face{font-family:Deva;font-weight:700;src:url(${font("noto-sans-devanagari-latin-700-normal.woff2")});unicode-range:U+0000-00FF,U+2000-206F,U+20B9}
@font-face{font-family:Deva;font-weight:400;src:url(${font("noto-sans-devanagari-devanagari-400-normal.woff2")})}
@font-face{font-family:Deva;font-weight:400;src:url(${font("noto-sans-devanagari-latin-400-normal.woff2")});unicode-range:U+0000-00FF,U+2000-206F,U+20B9}
*{margin:0;box-sizing:border-box} html,body{width:1080px;height:1920px;background:transparent;font-family:Deva;color:#fff}
.top{position:absolute;top:250px;left:60px;right:60px;text-align:center}
.cap{display:inline-block;background:rgba(42,30,23,.72);border:2px solid rgba(240,194,123,.6);border-radius:28px;padding:26px 40px;font-weight:700;font-size:64px;line-height:1.35;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.cap em{font-style:normal;color:#f0c27b}
.brand{position:absolute;bottom:250px;left:0;right:0;text-align:center;font-weight:700;font-size:54px;color:#f0c27b;letter-spacing:2px;text-shadow:0 2px 10px rgba(0,0,0,.7)}
.note{position:absolute;bottom:190px;left:0;right:0;text-align:center;font-weight:400;font-size:30px;color:rgba(255,255,255,.85);text-shadow:0 2px 6px rgba(0,0,0,.8)}
.end{position:absolute;top:330px;left:60px;right:60px;text-align:center}
.end h1{font-size:120px;color:#f0c27b;font-weight:700;letter-spacing:2px;text-shadow:0 4px 18px rgba(0,0,0,.6)}
.end p{font-size:64px;font-weight:700;margin-top:30px;line-height:1.35}
.end .cta{display:inline-block;margin-top:60px;background:#f0c27b;color:#2a1e17;border-radius:999px;padding:24px 60px;font-size:58px;font-weight:700}
.end small{display:block;margin-top:40px;font-size:40px;color:rgba(255,255,255,.9)}
`;
const footer =
  '<div class="brand">AstroVidya</div><div class="note">मनोरंजन और आत्मचिंतन के लिए</div>';
const scenes = {
  o1:
    '<div class="top"><div class="cap">क्या आपकी हथेली में<br><em>आपकी कहानी</em> छिपी है?</div></div>' +
    footer,
  o2:
    '<div class="top"><div class="cap">दाईं हथेली की फ़ोटो लीजिए<br><em>पहली रीडिंग मुफ़्त</em></div></div>' +
    footer,
  o3:
    '<div class="top"><div class="cap">मुफ़्त कुंडली · पंचांग · राशिफल<br><em>आपकी अपनी भाषा में</em></div></div>' +
    footer,
  o4:
    '<div class="top"><div class="cap">शादी की बात चल रही है?<br><em>गुण मिलान अभी देखिए</em></div></div>' +
    footer,
  o5: '<div class="end"><h1>AstroVidya</h1><p>हस्तरेखा · कुंडली · मिलान<br>राशिफल · पंचांग</p><div class="cta">आज ही हथेली दिखाइए</div><small>लिंक बायो में</small></div><div class="note">मनोरंजन और आत्मचिंतन के लिए</div>',
};
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [name, html] of Object.entries(scenes)) {
  await p.setContent(
    "<html><head><style>" + css + "</style></head><body>" + html + "</body></html>",
  );
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: name + ".png", omitBackground: true });
}
await b.close();
console.log("ok");
