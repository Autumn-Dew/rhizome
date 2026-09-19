/**
 * Rhizome 运行时文件日志（main 进程）。
 *
 * 纯工具模块：把 main 侧 console 与 renderer 的 console 消息落盘到
 * `userData/logs/rhizome-YYYYMMDD.log`，便于在**打包环境**（无 DevTools）
 * 让用户回传日志定位渲染/性能问题。
 *
 * 设计要点：
 * - 只用 `fs`（同步 API），启动早期即可用，不依赖 electron。
 * - `hookConsole()` 覆盖 main 的 console 时必须调用**保存的原始方法**输出，
 *   否则会递归。
 * - 任何异常都静默降级，绝不让日志本身影响应用运行。
 */
const fs = require('fs')
const path = require('path')

function pad(n) {
  return String(n).padStart(2, '0')
}

/** 当日文件名日期戳 YYYYMMDD（本地时区） */
function todayStamp(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/** ISO 时间戳，便于跨设备对齐 */
function timeStamp(d = new Date()) {
  return d.toISOString()
}

/** 把任意 console 参数格式化成一行可读文本 */
function fmtArg(a) {
  if (a instanceof Error) return a.stack || a.message
  if (typeof a === 'string') return a
  if (a === undefined) return 'undefined'
  try {
    return JSON.stringify(a)
  } catch {
    return String(a)
  }
}

/**
 * @param {string} logDir 日志目录（通常 app.getPath('userData')/logs）
 */
function createLogger(logDir) {
  let stream = null
  let filePath = ''
  // 默认关闭：日志落盘由渲染进程「调试日志」开关（设置页 → 系统选项）控制。
  // 关闭时 write() 直接返回，终端 console 输出不受影响。
  let enabled = false
  try {
    fs.mkdirSync(logDir, { recursive: true })
    filePath = path.join(logDir, `rhizome-${todayStamp()}.log`)
    stream = fs.createWriteStream(filePath, { flags: 'a' })
  } catch {
    // 日志不可用则静默降级（filePath 为空）
  }

  const orig = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }

  function write(level, args) {
    if (!enabled || !stream) return
    try {
      stream.write(`[${timeStamp()}] [${level}] ${args.map(fmtArg).join(' ')}\n`)
    } catch {
      /* ignore */
    }
  }

  return {
    filePath,
    write,
    info: (...a) => write('INFO', a),
    warn: (...a) => write('WARN', a),
    error: (...a) => write('ERROR', a),
    /** 日志落盘开关（默认关闭）。关闭时仍走 hookConsole 的终端输出 */
    setEnabled(v) { enabled = !!v },
    isEnabled() { return enabled },
    /** 覆盖 main 侧 console：终端原样输出 + 落盘（用原始方法避免递归） */
    hookConsole() {
      console.log = (...a) => { orig.log(...a); write('INFO', a) }
      console.info = (...a) => { orig.info(...a); write('INFO', a) }
      console.warn = (...a) => { orig.warn(...a); write('WARN', a) }
      console.error = (...a) => { orig.error(...a); write('ERROR', a) }
    },
    close() {
      try { if (stream) stream.end() } catch { /* ignore */ }
    },
  }
}

module.exports = { createLogger, todayStamp, timeStamp, fmtArg }
