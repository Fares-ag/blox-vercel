import fs from 'node:fs'

/**
 * One-off fixer for a corrupted file encoding / broken code block that prevents
 * `packages/customer` from compiling.
 *
 * - Normalizes the file to valid UTF-8
 * - Replaces the malformed `paymentStatus` block with a safe IIFE expression
 * - Sanitizes a corrupted console.error prefix (garbled UTF-8 sequence)
 */
const filePath =
  'packages/customer/src/modules/customer/features/payments/pages/PaymentHistoryPage/PaymentHistoryPage.tsx'

let source = fs.readFileSync(filePath, 'utf8')

// Replace the broken block between `const paymentStatus ...` and `allTransactions.push({`
const blockRe =
  /(\s*)const paymentStatus: PaymentTransaction\['status'\][\s\S]*?\n\s*allTransactions\.push\(\{\n/

if (!blockRe.test(source)) {
  console.error(
    `Could not find expected paymentStatus block in ${filePath}. Aborting to avoid accidental edits.`
  )
  process.exit(1)
}

source = source.replace(blockRe, (_match, indent) => {
  return (
    `${indent}const paymentStatus: PaymentTransaction['status'] = (() => {\n` +
    `${indent}  if (payment.status === 'paid' || payment.paidDate) return 'paid';\n` +
    `${indent}  if (payment.status === 'active') return 'active';\n` +
    `${indent}  if (payment.status === 'upcoming') return 'upcoming';\n` +
    `${indent}  if (dueDate.isBefore(now, 'day')) return 'overdue';\n` +
    `${indent}  if (dueDate.isSame(now, 'day')) return 'active';\n` +
    `${indent}  return 'upcoming';\n` +
    `${indent}})();\n\n` +
    `${indent}allTransactions.push({\n`
  )
})

// Fix a common corruption: an emoji prefix becomes a garbled sequence (e.g. "âŒ").
source = source.replace(
  /console\.error\(\s*'[^']*Failed to load payment history:/g,
  "console.error('Failed to load payment history:"
)

fs.writeFileSync(filePath, source, 'utf8')
console.log(`Fixed ${filePath}`)


