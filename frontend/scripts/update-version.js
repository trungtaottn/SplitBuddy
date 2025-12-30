#!/usr/bin/env node
/**
 * Script to update version.json before each build
 * This ensures users get the latest version after deployment
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const versionFilePath = path.join(__dirname, '../public/version.json')

// Generate version based on timestamp
const now = new Date()
const version = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}${now.getMinutes()}`

const versionData = {
  version: version,
  buildTime: now.toISOString()
}

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2))
console.log(`✅ Updated version.json to ${version}`)
