const fs = require("fs");
const path = require("path");
const content = `name: Newsbot cron

on:
  schedule:
    - cron: "*/10 * * * *"
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Trigger news ingest
        run: |
          code=$(curl -sS -o /tmp/newsbot-response.json -w "%{http_code}" \\
            -X POST \\
            -H "Authorization: Bearer \${{ secrets.CRON_SECRET }}" \\
            "https://fmheart-tau.vercel.app/api/cron/newsbot")
          echo "HTTP $code"
          cat /tmp/newsbot-response.json
          if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
            exit 1
          fi
`;
const p = path.join("C:", "Users", "narad", "fmheart", ".github", "workflows", "newsbot.yml");
fs.mkdirSync(path.dirname(p), { recursive: true });
fs.writeFileSync(p, content, "utf8");
console.log("written", p);
