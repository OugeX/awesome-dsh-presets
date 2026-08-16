#!/usr/bin/env node
// awesome-dsh-presets 结构校验器
// 用法: node tools/validate-presets.mjs [--harness <node_modules 根目录（其中含 @deepseek-ai/* 包）>]
// 规则: YAML 可解析(含 !!js 方言)；顶层为列表；每行含 id 与 name；
//       cordis:group 行的 config 递归检查；--harness 提供时校验每个包真实存在。
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'

const ROOT = new URL('..', import.meta.url).pathname
const args = process.argv.slice(2)
let harness = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--harness' && args[i + 1]) harness = args[i + 1]
}

let yaml = null
if (harness) {
  try {
    const req = createRequire(join(harness, 'x.js'))
    yaml = req('yaml')
  } catch { console.warn('警告: 未在 harness 中找到 yaml 包，跳过完整 YAML 解析（将退化为结构文本检查）') }
}

let errors = 0
const pkgCache = new Set()
function fail(msg) { console.error('  ❌ ' + msg); errors++ }
function pkgExists(name) {
  if (pkgCache.has(name)) return true
  if (!harness) return null
  // name 形如 @scope/pkg 或 @scope/pkg/sub：只校验包本身（子路径是包内导出）
  const pkgPart = name.split('/').slice(0, 2).join('/')
  const ok = existsSync(join(harness, pkgPart))
  if (ok) pkgCache.add(name)
  return ok
}
function checkRows(rows, where) {
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) { fail(`${where}: 行不是对象: ${JSON.stringify(row)?.slice(0, 80)}`); continue }
    if (typeof row.id !== 'string' || !row.id) fail(`${where}: 行缺少 id`)
    if (typeof row.name !== 'string' || !row.name) { fail(`${where}: 行缺少 name`); continue }
    if (row.name.startsWith('cordis:')) {
      if (row.name === 'cordis:group') {
        if (!Array.isArray(row.config)) fail(`${where}/${row.id}: cordis:group 的 config 应为列表`)
        else checkRows(row.config, `${where}/${row.id}`)
      }
      continue
    }
    if (harness) {
      if (row.name.startsWith('@')) {
        if (pkgExists(row.name) === false) fail(`${where}/${row.id}: 包不存在: ${row.name}`)
      } else {
        fail(`${where}/${row.id}: 包名应为 @scope 形式: ${row.name}`)
      }
    }
  }
}

const presetsDir = join(ROOT, 'presets')
if (!existsSync(presetsDir)) { console.error('缺少 presets/ 目录'); process.exit(2) }
for (const id of readdirSync(presetsDir).sort()) {
  const dir = join(presetsDir, id)
  const file = join(dir, 'agent.cordis.yml')
  if (!existsSync(file)) { fail(`${id}: 缺少 agent.cordis.yml`); continue }
  const text = readFileSync(file, 'utf8')
  let doc = null
  if (yaml) {
    try { doc = yaml.parse(text) } catch (e) { fail(`${id}: YAML 解析失败: ${e.message}`); continue }
    if (!Array.isArray(doc)) { fail(`${id}: 顶层不是列表`); continue }
    checkRows(doc, id)
  } else {
    // 无 yaml 时的退化检查：确认存在行结构关键字
    if (!text.includes('- id:') || !text.includes('name:')) fail(`${id}: 缺少行结构（建议提供 --harness 做完整校验）`)
  }
  const meta = join(dir, 'preset.yml')
  if (!existsSync(meta)) { fail(`${id}: 缺少 preset.yml`); continue }
  let metaDoc = null
  if (yaml) {
    try { metaDoc = yaml.parse(readFileSync(meta, 'utf8')) } catch (e) { fail(`${id}: preset.yml 解析失败`); continue }
    if (!metaDoc || typeof metaDoc.name !== 'string' || typeof metaDoc.description !== 'string') fail(`${id}: preset.yml 需要 name 与 description`)
  }
  console.log(`  ✅ ${id}${harness ? '（含包存在性校验）' : ''}`)
}
console.log(`\n校验完成: ${errors} 个错误`)
process.exit(errors ? 1 : 0)
