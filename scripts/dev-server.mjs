#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const workspace = resolve(process.cwd());
const rawArgs = process.argv.slice(2);
const clean = rawArgs.includes("--clean");
const nextArgs = rawArgs.filter((arg) => arg !== "--clean");
const devDistDir = ".next-dev";

const existingServers = findNextServers(workspace);

if (existingServers.length > 0) {
  console.log("A Next server is already running for this workspace.");
  for (const server of existingServers) {
    const ports = getListeningPorts(server.pid);
    const urls = ports.length
      ? ports.map((port) => `http://localhost:${port}`).join(", ")
      : "port unknown";
    console.log(`- PID ${server.pid}: ${urls}`);
  }
  console.log(`Not starting another one, because concurrent Next dev servers can corrupt ${devDistDir}.`);
  if (clean) {
    console.log(`Skipped --clean because the running server is using ${devDistDir}.`);
  }
  process.exit(0);
}

const cacheIssue = clean ? "--clean requested" : getNextCacheIssue(workspace, devDistDir);
if (cacheIssue) {
  if (!clean) {
    console.log(`Detected stale ${devDistDir} cache (${cacheIssue}); removing it before start.`);
  }
  removeNextCache(workspace, devDistDir);
}

const nextCli = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextCli, "dev", ...nextArgs], {
  cwd: workspace,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Failed to start Next dev server: ${error.message}`);
  process.exit(1);
});

function findNextServers(root) {
  const processes = listProcesses();
  const currentAncestors = getAncestorPids(processes, process.pid);
  return processes
    .filter((processInfo) => processInfo.pid !== process.pid)
    .filter((processInfo) => !currentAncestors.has(processInfo.pid))
    .filter((processInfo) => processInfo.commandLine)
    .filter((processInfo) => isProjectDevProcess(processInfo.commandLine, root));
}

function listProcesses() {
  if (process.platform === "win32") {
    const output = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress",
      ],
      { encoding: "utf8" },
    ).trim();

    if (!output) {
      return [];
    }

    const parsed = JSON.parse(output);
    return asArray(parsed).map((entry) => ({
      pid: Number(entry.ProcessId),
      parentPid: Number(entry.ParentProcessId),
      commandLine: String(entry.CommandLine ?? ""),
    }));
  }

  const output = execFileSync("ps", ["-eo", "pid=,ppid=,args="], {
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(.+)$/);
      if (!match) {
        return null;
      }
      return {
        pid: Number(match[1]),
        parentPid: Number(match[2]),
        commandLine: match[3],
      };
    })
    .filter(Boolean);
}

function getAncestorPids(processes, pid) {
  const byPid = new Map(processes.map((processInfo) => [processInfo.pid, processInfo]));
  const ancestors = new Set();
  let current = byPid.get(pid);
  while (current?.parentPid && !ancestors.has(current.parentPid)) {
    ancestors.add(current.parentPid);
    current = byPid.get(current.parentPid);
  }
  return ancestors;
}

function commandMentionsWorkspace(commandLine, root) {
  const normalizedCommand = normalizeForMatch(commandLine);
  const normalizedRoot = normalizeForMatch(root);
  return normalizedCommand.includes(normalizedRoot);
}

function isProjectDevProcess(commandLine, root) {
  const normalizedCommand = normalizeForMatch(commandLine);
  const mentionsWorkspace = commandMentionsWorkspace(commandLine, root);
  if (normalizedCommand.includes("scripts/dev-server.mjs")) {
    return true;
  }
  if (!mentionsWorkspace) {
    return false;
  }

  return (
    (
      normalizedCommand.includes("node_modules/next/dist/bin/next") &&
      normalizedCommand.includes(" dev")
    ) ||
    (
      normalizedCommand.includes("node_modules/next/") &&
      normalizedCommand.includes("dist/server/lib/start-server.js")
    )
  );
}

function normalizeForMatch(value) {
  return String(value).replaceAll("\\", "/").toLowerCase();
}

function getListeningPorts(pid) {
  if (process.platform !== "win32") {
    return [];
  }

  try {
    const output = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq ${Number(
          pid,
        )} } | Select-Object -ExpandProperty LocalPort -Unique | ConvertTo-Json -Compress`,
      ],
      { encoding: "utf8" },
    ).trim();

    if (!output) {
      return [];
    }

    return asArray(JSON.parse(output))
      .map((port) => Number(port))
      .filter((port) => Number.isInteger(port))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function removeNextCache(root, distDir) {
  const nextDir = resolve(root, distDir);
  if (!existsSync(nextDir)) {
    console.log(`No ${distDir} cache to remove.`);
    return;
  }

  if (!nextDir.startsWith(`${root}\\`) && !nextDir.startsWith(`${root}/`)) {
    throw new Error(`Refusing to remove path outside workspace: ${nextDir}`);
  }

  if (basename(nextDir) !== distDir) {
    throw new Error(`Refusing to remove unexpected path: ${nextDir}`);
  }

  rmSync(nextDir, { recursive: true, force: true });
  console.log(`Removed ${distDir} cache.`);
}

function getNextCacheIssue(root, distDir) {
  const nextDir = resolve(root, distDir);
  if (!existsSync(nextDir)) {
    return null;
  }

  const requiredFiles = [
    "package.json",
    "routes-manifest.json",
    "build-manifest.json",
  ];
  const missing = requiredFiles.filter((file) => !existsSync(resolve(nextDir, file)));
  return missing.length > 0 ? `missing ${missing.join(", ")}` : null;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
}
