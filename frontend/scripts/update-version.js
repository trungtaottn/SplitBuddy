#!/usr/bin/env node
/**
 * Script to update version.json before each build
 * 
 * Version strategy:
 * - main branch: Use git tag or commit hash (only update on merge/deploy)
 * - dev branch: Use timestamp-based version (update on each build)
 * - local builds: Use dev prefix with timestamp
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const versionFilePath = path.join(__dirname, '../public/version.json')

// Get current branch
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
  } catch (error) {
    // Not a git repo or git not available
    return null
  }
}

// Get git commit hash (short)
function getCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch (error) {
    return null
  }
}

// Get latest git tag
function getLatestTag() {
  try {
    const tag = execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf-8' }).trim()
    return tag || null
  } catch (error) {
    return null
  }
}

// Check if we're in CI/CD (GitHub Actions)
function isCI() {
  return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
}

// Check if we're on main branch
function isMainBranch() {
  const branch = getCurrentBranch()
  return branch === 'main' || branch === 'refs/heads/main'
}

// Generate version based on strategy
function generateVersion() {
  const branch = getCurrentBranch()
  const now = new Date()
  const commitHash = getCommitHash()
  
  // In CI/CD on main branch: use tag or commit hash
  if (isCI() && isMainBranch()) {
    const tag = getLatestTag()
    if (tag) {
      // Extract version from tag (e.g., v1.0.0 -> 1.0.0)
      const version = tag.replace(/^v/, '')
      return {
        version: version,
        buildTime: now.toISOString(),
        commit: commitHash || 'unknown',
        branch: 'main'
      }
    }
    // No tag, use commit hash
    if (commitHash) {
      return {
        version: `main.${commitHash}`,
        buildTime: now.toISOString(),
        commit: commitHash,
        branch: 'main'
      }
    }
  }
  
  // On main branch locally: check if version.json exists and hasn't changed
  if (isMainBranch() && !isCI()) {
    try {
      const existing = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'))
      // If version exists and commit hash matches, don't update
      if (existing.commit === commitHash) {
        console.log(`✅ Keeping existing version: ${existing.version}`)
        return existing
      }
    } catch (error) {
      // File doesn't exist, continue to create new version
    }
    // Commit changed, update version
    if (commitHash) {
      return {
        version: `main.${commitHash}`,
        buildTime: now.toISOString(),
        commit: commitHash,
        branch: 'main'
      }
    }
  }
  
  // Dev branch or local builds: use timestamp
  const timestamp = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}${now.getMinutes()}`
  const prefix = branch === 'dev' ? 'dev' : 'local'
  
  return {
    version: `${prefix}.${timestamp}${commitHash ? `.${commitHash}` : ''}`,
    buildTime: now.toISOString(),
    commit: commitHash || 'unknown',
    branch: branch || 'unknown'
  }
}

const versionData = generateVersion()

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2))
console.log(`✅ Updated version.json to ${versionData.version} (${versionData.branch})`)
