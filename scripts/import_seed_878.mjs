#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SEED_FILE = path.join(__dirname, 'seed-878.json')
const API_BASE = process.env.API_BASE || 'http://localhost:8080/api'

let authToken = ''

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  ...extra
})

const request = async (url, options = {}) => {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: headers(options.headers || {})
  })
  const data = await res.json()
  return data
}

const login = async (username, password) => {
  console.log(`🔐 登录中: ${username}`)
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
  if (res.code === 200 && res.data?.token) {
    authToken = res.data.token
    console.log(`✅ 登录成功: ${username}`)
    return true
  }
  console.error(`❌ 登录失败:`, res)
  return false
}

const createFlight = async (flight) => {
  const res = await request('/flight', {
    method: 'POST',
    body: JSON.stringify(flight)
  })
  return res
}

const createUld = async (uld) => {
  const res = await request('/uld', {
    method: 'POST',
    body: JSON.stringify(uld)
  })
  return res
}

const createWaybill = async (waybill) => {
  const res = await request('/waybill', {
    method: 'POST',
    body: JSON.stringify(waybill)
  })
  return res
}

const outputBusinessIds = (seedData) => {
  console.log('\n' + '='.repeat(60))
  console.log('📋 业务编号清单 - seed-878')
  console.log('='.repeat(60))

  console.log('\n✈️  航班业务编号:')
  seedData.flights.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.flightNo} (id: ${f.id}) - ${f.departure} → ${f.arrival}`)
  })

  console.log('\n📦 板箱业务编号:')
  seedData.ulds.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.uldCode} (id: ${u.id}) - 类型: ${u.uldType}, 状态: ${u.status}`)
  })

  console.log('\n📄 货邮单业务编号:')
  seedData.waybills.forEach((w, i) => {
    const dangerous = w.dangerousFlag ? '⚠️  危险品' : ''
    const security = `安检: ${w.securityStatus}`
    console.log(`  ${i + 1}. ${w.waybillNo} (id: ${w.id}) - ${w.shipper} → ${w.consignee} ${dangerous} [${security}]`)
    if (w.remark) {
      console.log(`     备注: ${w.remark}`)
    }
  })

  console.log('\n🔍 复核记录业务编号:')
  seedData.reviewRecords.forEach((r, i) => {
    console.log(`  ${i + 1}. id: ${r.id} - ULD: ${r.uldId}, 类型: ${r.reviewType}, 差值: ${r.weightDiff}kg`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('📊 统计信息:')
  console.log(`  航班数量: ${seedData.flights.length}`)
  console.log(`  板箱数量: ${seedData.ulds.length}`)
  console.log(`  货邮单数量: ${seedData.waybills.length}`)
  console.log(`  危险品货邮单: ${seedData.waybills.filter(w => w.dangerousFlag).length}`)
  console.log(`  未安检货邮单: ${seedData.waybills.filter(w => w.securityStatus === 'PENDING').length}`)
  console.log(`  复核记录数量: ${seedData.reviewRecords.length}`)
  console.log('='.repeat(60) + '\n')
}

const importSeedData = async (seedData) => {
  console.log('🚀 开始导入样例数据...\n')

  if (!(await login('operator', 'operator123'))) {
    console.error('❌ 无法登录，导入终止')
    return false
  }

  console.log('\n📥 导入航班数据...')
  for (const flight of seedData.flights) {
    const res = await createFlight(flight)
    if (res.code === 200) {
      console.log(`  ✅ 航班 ${flight.flightNo} 导入成功`)
    } else {
      console.log(`  ⚠️  航班 ${flight.flightNo}: ${res.message || '已存在'}`)
    }
  }

  console.log('\n📥 导入板箱数据...')
  for (const uld of seedData.ulds) {
    const res = await createUld(uld)
    if (res.code === 200) {
      console.log(`  ✅ 板箱 ${uld.uldCode} 导入成功`)
    } else {
      console.log(`  ⚠️  板箱 ${uld.uldCode}: ${res.message || '已存在'}`)
    }
  }

  console.log('\n📥 导入货邮单数据...')
  for (const waybill of seedData.waybills) {
    const res = await createWaybill(waybill)
    if (res.code === 200) {
      console.log(`  ✅ 货邮单 ${waybill.waybillNo} 导入成功`)
    } else {
      console.log(`  ⚠️  货邮单 ${waybill.waybillNo}: ${res.message || '已存在'}`)
    }
  }

  console.log('\n✅ 样例数据导入完成！')
  return true
}

const main = async () => {
  console.log('\n📦 航空货站装板复核系统 - 样例数据导入工具')
  console.log('='.repeat(60))

  if (!fs.existsSync(SEED_FILE)) {
    console.error(`❌ 样例数据文件不存在: ${SEED_FILE}`)
    process.exit(1)
  }

  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'))

  outputBusinessIds(seedData)

  const shouldImport = process.argv.includes('--import') || process.argv.includes('-i')

  if (shouldImport) {
    await importSeedData(seedData)
  } else {
    console.log('💡 提示: 使用 --import 或 -i 参数执行数据导入')
    console.log('   示例: node scripts/import_seed_878.mjs --import\n')
  }
}

main().catch(console.error)
