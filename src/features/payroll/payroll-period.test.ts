import {
  comparePayrollPeriod,
  currentPayrollPeriod,
  isPayrollPeriodKey,
  parsePayrollPeriod,
  payrollPeriodParts,
  shiftPayrollPeriod,
} from './payroll-period'

describe('payroll-period', () => {
  test('xác định kỳ hiện tại theo múi giờ Việt Nam (UTC+7)', () => {
    // 2026-10-31T17:30:00Z = 2026-11-01 00:30 giờ VN
    expect(currentPayrollPeriod(new Date('2026-10-31T17:30:00Z'))).toBe('2026-11')
    // 2026-10-31T16:59:00Z = 2026-10-31 23:59 giờ VN
    expect(currentPayrollPeriod(new Date('2026-10-31T16:59:00Z'))).toBe('2026-10')
  })

  test('chuyển tháng qua ranh giới năm đúng chiều tiến và lùi', () => {
    expect(shiftPayrollPeriod('2026-01', -1)).toBe('2025-12')
    expect(shiftPayrollPeriod('2025-12', 1)).toBe('2026-01')
    expect(shiftPayrollPeriod('2026-11', -2)).toBe('2026-09')
  })

  test('kiểm tra định dạng, tách phần và so sánh kỳ', () => {
    expect(isPayrollPeriodKey('2026-11')).toBe(true)
    expect(isPayrollPeriodKey('2026-13')).toBe(false)
    expect(isPayrollPeriodKey('2026-00')).toBe(false)
    expect(parsePayrollPeriod('2026-03')).toEqual({ year: 2026, month: 3 })
    expect(payrollPeriodParts('2026-03')).toEqual({ month: '03', year: '2026' })
    expect(comparePayrollPeriod('2026-10', '2026-11')).toBe(-1)
    expect(comparePayrollPeriod('2026-11', '2026-11')).toBe(0)
    expect(comparePayrollPeriod('2026-12', '2026-11')).toBe(1)
  })
})
