// Parse a pasted Date / New Users / DAU table.
//
// Header detection:
//   - looks for cells whose normalized name matches "date|day", "new_users|installs|new",
//     and "dau|active_users|active"
//   - if no recognizable header, falls back to positional [date, newUsers, dau]
//
// Returns:
//   { errors:[], warnings:[], rows:[{date, newUsers, dau}], dates:[…], newUsers:[…], dau:[…] }
//
// `dates` is purely informational — math only consumes newUsers and dau.

function detectSeparator(line) {
  if (line.includes('\t')) return '\t'
  const commas = (line.match(/,/g) || []).length
  const semis = (line.match(/;/g) || []).length
  if (semis > commas) return ';'
  if (commas > 0) return ','
  return null
}

function splitLine(line, sep) {
  return sep === null ? line.split(/\s+/) : line.split(sep)
}

const COLUMN_HINTS = {
  date: /^(date|day|cohort)$/i,
  newUsers: /^(new[_\s]?users?|installs?|signups?|registrations?|new)$/i,
  dau: /^(dau|active[_\s]?users?|active|mau)$/i,
}

function tryParseNumber(s) {
  const raw = String(s ?? '').trim()
  if (!raw || raw === '-' || raw === '—' || raw === 'null' || raw === 'N/A') return null
  const cleaned = raw.replace(/[%\s]/g, '').replace(/,/g, '')
  const v = parseFloat(cleaned)
  return Number.isFinite(v) ? v : null
}

/**
 * @param {string} text
 */
export function parseDAUTable(text) {
  const errors = []
  const warnings = []
  const empty = { errors, warnings, rows: [], dates: [], newUsers: [], dau: [] }

  if (!text || !text.trim()) {
    errors.push('Empty input.')
    return empty
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 4) {
    errors.push('Need at least one header row + 3 data rows.')
    return empty
  }

  const sep = detectSeparator(lines[0])
  const headerCells = splitLine(lines[0], sep).map((c) => c.trim())
  if (headerCells.length < 2) {
    errors.push('Need at least two columns (new_users, DAU).')
    return empty
  }

  // Try to map header cells to roles.
  const role = headerCells.map((cell) => {
    if (COLUMN_HINTS.date.test(cell)) return 'date'
    if (COLUMN_HINTS.newUsers.test(cell)) return 'newUsers'
    if (COLUMN_HINTS.dau.test(cell)) return 'dau'
    return null
  })
  let dateIdx = role.indexOf('date')
  let newIdx = role.indexOf('newUsers')
  let dauIdx = role.indexOf('dau')

  // If no recognizable header, treat the first row as data and use positional layout.
  let bodyStart = 1
  if (newIdx === -1 || dauIdx === -1) {
    if (headerCells.length >= 3) {
      dateIdx = 0
      newIdx = 1
      dauIdx = 2
    } else if (headerCells.length === 2) {
      dateIdx = -1
      newIdx = 0
      dauIdx = 1
    } else {
      errors.push('Could not infer columns from header. Expected: Date, New Users, DAU.')
      return empty
    }
    // Was the first row actually a data row? Check whether either expected
    // numeric column parses as a number.
    const sample = splitLine(lines[0], sep).map((c) => c.trim())
    if (
      tryParseNumber(sample[newIdx]) !== null &&
      tryParseNumber(sample[dauIdx]) !== null
    ) {
      bodyStart = 0
      warnings.push('No header row detected — treating columns positionally as [date, new_users, DAU].')
    }
  }

  const rows = []
  for (let i = bodyStart; i < lines.length; i++) {
    const cells = splitLine(lines[i], sep).map((c) => c.trim())
    const newUsers = tryParseNumber(cells[newIdx])
    const dau = tryParseNumber(cells[dauIdx])
    const date = dateIdx >= 0 ? cells[dateIdx] ?? '' : ''
    if (newUsers == null || dau == null) {
      errors.push(`Row ${i + 1}: could not parse new_users or DAU.`)
      return empty
    }
    rows.push({ date, newUsers, dau })
  }

  if (rows.length < 3) {
    errors.push(`Need at least 3 data rows (got ${rows.length}).`)
    return empty
  }

  return {
    errors,
    warnings,
    rows,
    dates: rows.map((r) => r.date),
    newUsers: rows.map((r) => r.newUsers),
    dau: rows.map((r) => r.dau),
    separator: sep === '\t' ? 'tab' : sep ?? 'whitespace',
  }
}
