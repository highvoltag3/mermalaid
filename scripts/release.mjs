#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const VALID_BUMPS = new Set(["patch", "minor", "major"]);
const TAURI_CARGO_TOML_PATH = "src-tauri/Cargo.toml";
const TAURI_CONF_PATH = "src-tauri/tauri.conf.json";

function run(command, options = {}) {
  const output = execSync(command, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    ...options,
  });

  if (typeof output === "string") {
    return output.trim();
  }

  if (Buffer.isBuffer(output)) {
    return output.toString("utf8").trim();
  }

  return "";
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

function updateTauriVersions(version) {
  let cargoToml = "";
  try {
    cargoToml = readFileSync(TAURI_CARGO_TOML_PATH, "utf8");
  } catch {
    fail(`Unable to read ${TAURI_CARGO_TOML_PATH}.`, [
      "Verify the file exists and is readable.",
      "Fix repository state, then retry release.",
    ]);
  }

  const updatedCargoToml = cargoToml.replace(
    /^version = "([^"]+)"$/m,
    `version = "${version}"`,
  );

  if (updatedCargoToml === cargoToml) {
    fail(`Unable to update version in ${TAURI_CARGO_TOML_PATH}.`, [
      "Ensure [package] version is present in Cargo.toml.",
      "Update the file manually, then retry release.",
    ]);
  }

  try {
    writeFileSync(TAURI_CARGO_TOML_PATH, updatedCargoToml, "utf8");
  } catch {
    fail(`Unable to write ${TAURI_CARGO_TOML_PATH}.`, [
      "Verify filesystem permissions.",
      "Fix the issue, then retry release.",
    ]);
  }

  let tauriConfigRaw = "";
  try {
    tauriConfigRaw = readFileSync(TAURI_CONF_PATH, "utf8");
  } catch {
    fail(`Unable to read ${TAURI_CONF_PATH}.`, [
      "Verify the file exists and is readable.",
      "Fix repository state, then retry release.",
    ]);
  }

  let tauriConfig;
  try {
    tauriConfig = JSON.parse(tauriConfigRaw);
  } catch {
    fail(`Unable to parse JSON in ${TAURI_CONF_PATH}.`, [
      "Fix JSON syntax in tauri config.",
      "Retry the release command.",
    ]);
  }

  tauriConfig.version = version;

  try {
    writeFileSync(TAURI_CONF_PATH, `${JSON.stringify(tauriConfig, null, 2)}\n`, "utf8");
  } catch {
    fail(`Unable to write ${TAURI_CONF_PATH}.`, [
      "Verify filesystem permissions.",
      "Fix the issue, then retry release.",
    ]);
  }
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
  let rawVersion = "";
  try {
    rawVersion = run(`npm version ${bump} --no-git-tag-version`);
  } catch {
    fail("Failed to bump npm version.", [
      "Check package.json/package-lock.json state.",
      "Resolve npm errors, then retry release.",
    ]);
  }

  const version = rawVersion.replace(/^v/, "");
  updateTauriVersions(version);

  try {
    run("git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json");
    run(`git commit -m "v${version}"`);
    run(`git tag "v${version}"`);
  } catch {
    fail("Failed to create release commit/tag.", [
      "Check git status for conflicted or unstaged files.",
      "Resolve git errors, then retry release.",
    ]);
  }

  console.log(`Version bumped and tag created: v${version}`);
  try {
    run("git push origin main --follow-tags", { stdio: "inherit" });
  } catch {
    fail("Failed to push release commit/tag to origin.", [
      "Check your network connection and git remote access.",
      "Confirm you have permission to push to origin/main.",
      "Resolve push errors, then re-run release.",
    ]);
  }

  let remoteTagRef = "";
  try {
    remoteTagRef = run(`git ls-remote --tags origin "refs/tags/v${version}"`);
  } catch {
    fail("Unable to verify release tag on remote origin.", [
      "Check your network connection and git remote access.",
      `Confirm tag exists remotely: git ls-remote --tags origin "refs/tags/v${version}"`,
      "Retry the release command if verification fails due to transient errors.",
    ]);
  }

  if (remoteTagRef === "") {
    fail(`Release tag v${version} was not found on origin after push.`, [
      `Push the tag explicitly: git push origin "v${version}"`,
      "Confirm remote tags are visible, then retry release if needed.",
    ]);
  }

  console.log(`Verified remote tag: v${version}`);
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
