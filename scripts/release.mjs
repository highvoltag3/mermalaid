#!/usr/bin/env node

import { execSync } from "node:child_process";

const VALID_BUMPS = new Set(["patch", "minor", "major"]);

function run(command, options = {}) {
  return execSync(command, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    ...options,
  }).trim();
}

function fail(message, nextSteps = []) {
  console.error(`\nRelease pre-check failed: ${message}`);
  if (nextSteps.length > 0) {
    console.error("\nNext steps:");
    for (const step of nextSteps) {
      console.error(`- ${step}`);
    }
  }
  process.exit(1);
}

function assertToolExists(toolName) {
  try {
    run(`command -v ${toolName}`);
  } catch {
    fail(`Required tool not found: ${toolName}`, [
      `Install ${toolName} and ensure it is on your PATH.`,
    ]);
  }
}

function parseBump() {
  const bump = process.argv[2] ?? "patch";
  if (!VALID_BUMPS.has(bump)) {
    fail(`Invalid bump type "${bump}". Expected patch, minor, or major.`, [
      "Use one of: npm run release -- patch|minor|major",
      "Or run a shortcut: npm run release:patch|release:minor|release:major",
    ]);
  }
  return bump;
}

function assertCleanWorkingTree() {
  const status = run("git status --porcelain");
  if (status !== "") {
    fail("Working tree is not clean.", [
      "Commit or stash your local changes.",
      "Re-run the release command from a clean working tree.",
    ]);
  }
}

function assertOnMainBranch() {
  const branch = run("git branch --show-current");
  if (branch !== "main") {
    fail(`Current branch is "${branch}", expected "main".`, [
      "Switch branches: git checkout main",
      "Ensure main is the intended production branch before releasing.",
    ]);
  }
}

function assertUpToDateWithOriginMain() {
  try {
    run("git fetch origin main");
  } catch {
    fail("Unable to fetch origin/main.", [
      "Check your network connection and git remote access.",
      "Verify repository permissions for origin.",
      "Retry the release command once fetch succeeds.",
    ]);
  }

  let counts = "";
  try {
    counts = run("git rev-list --left-right --count origin/main...main");
  } catch {
    fail("Unable to compare local main with origin/main.", [
      "Ensure origin/main exists and your repository state is valid.",
      "Run: git fetch origin main",
      "Retry the release command once comparison succeeds.",
    ]);
  }

  const [behindRaw, aheadRaw] = counts.split(/\s+/);
  const behind = Number.parseInt(behindRaw ?? "0", 10);
  const ahead = Number.parseInt(aheadRaw ?? "0", 10);

  if (behind > 0) {
    fail(`Local main is behind origin/main by ${behind} commit(s).`, [
      "Pull latest changes: git pull --ff-only origin main",
      "Resolve any sync issues, then re-run release.",
    ]);
  }

  if (ahead > 0) {
    fail(`Local main is ahead of origin/main by ${ahead} commit(s).`, [
      "Push outstanding commits first: git push origin main",
      "Re-run release once local and remote main match.",
    ]);
  }
}

function release(bump) {
  console.log(`\nStarting release (${bump})...`);
  const newVersion = run(`npm version ${bump}`);
  console.log(`Version bumped and tag created: ${newVersion}`);
  try {
    run("git push origin main --follow-tags", { stdio: "inherit" });
  } catch {
    fail("Failed to push release commit/tag to origin.", [
      "Check your network connection and git remote access.",
      "Confirm you have permission to push to origin/main.",
      "Resolve push errors, then re-run release.",
    ]);
  }
  console.log("\nRelease push completed.");
  console.log("GitHub Actions should now trigger:");
  console.log("- Release (tag push: v*)");
  console.log("- Deploy to Appwrite Sites (push to main)");
}

function main() {
  assertToolExists("git");
  assertToolExists("npm");

  const bump = parseBump();
  assertCleanWorkingTree();
  assertOnMainBranch();
  assertUpToDateWithOriginMain();
  release(bump);
}

main();
