const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const home = await fetch("https://sinhala.newsfirst.lk/", { headers: { "User-Agent": UA } });
const html = await home.text();
const dated = [...html.matchAll(/\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9%-]+/gi)].map((m) => m[0]).slice(0, 10);
console.log("dated paths", dated);
const full = [...html.matchAll(/https:\/\/sinhala\.newsfirst\.lk\/\d{4}\/\d{2}\/\d{2}\/[^"'\\s<>]+/gi)].map((m) => m[0]).slice(0, 5);
console.log("full urls", full);
// search ng-state or serialized data
const stateIdx = html.indexOf("2026/07/26");
console.log("context", html.slice(stateIdx - 50, stateIdx + 200));
