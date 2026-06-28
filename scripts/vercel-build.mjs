import { spawnSync } from "node:child_process";

const hasConvexDeployKey = Boolean(process.env.CONVEX_DEPLOY_KEY);
const command = hasConvexDeployKey
  ? "npx convex deploy --cmd \"npm run build\" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL"
  : "npm run build";

const result = spawnSync(command, {
  shell: true,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
