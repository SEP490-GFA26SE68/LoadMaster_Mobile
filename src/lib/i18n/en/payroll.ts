import type { Dictionary } from '../types'
import type { payroll as source } from '../vi/payroll'

export const payroll = {
  title: 'Payroll',
  subtitle: 'Your monthly earnings',
  loading: 'Loading payslip…',
  period: {
    label: '{month}/{year}',
    previous: 'Previous month',
    next: 'Next month',
    currentButton: 'This month',
  },
  status: {
    DRAFT: 'Draft',
    LOCKED: 'Locked',
    UNCALCULATED: 'Not calculated',
  },
  summary: {
    totalLabel: 'Total earnings · {period}',
    trips: 'Trips',
    totalKg: 'Weight',
    totalKm: 'Distance',
    draftNotice: 'This payroll period is still a draft and may change before the manager locks it.',
  },
  breakdown: {
    title: 'Earnings breakdown',
    baseSalary: 'Monthly base salary',
    baseSalaryInactiveHint: 'No base salary applied for this period',
    kgAmount: 'Weight pay',
    kgFormula: '{kg} × {rate}/kg',
    kmAmount: 'Distance pay',
    kmFormula: '{km} km × {rate}/km',
    kpiMonth: 'Monthly KPI',
    kpiProgress: 'Carried {totalKg} of target {targetKg}',
    kpiAchieved: 'Target achieved',
    kpiNotAchieved: 'Target not achieved',
    kpiBonus: 'KPI bonus',
    handlingAmount: 'Self-handling allowance',
    commissionAmount: 'Revenue commission',
    total: 'Total earnings',
  },
  trips: {
    title: 'Trip breakdown ({count})',
    empty: 'No completed trips in this period.',
    shareBadge: '{percent}% share',
    allocatedKg: 'Allocated weight',
    allocatedKm: 'Allocated distance',
    baseOf: '/ {value}',
    kgUnit: '{value} kg',
    kmUnit: '{value} km',
    handlingLabel: 'Handling allowance',
    commissionLabel: 'Commission',
    openDetailHint: 'Open trip details for {code}',
    showMore: {
      one: 'Show {count} more trip',
      other: 'Show {count} more trips',
    },
    showLess: 'Show less',
  },
  uncalculated: {
    title: 'No payslip for {period}',
    description: 'Your manager has not calculated payroll for this period yet, or you have no payroll record for this month.',
    viewPrevious: 'View previous month',
  },
  warehouse: {
    summary: {
      trips: 'Trips',
      packages: 'Packages',
      loadedKg: 'Weight',
    },
    breakdown: {
      loadedAmount: 'Pay by loaded weight',
      kpiProgress: 'Loaded {totalKg} of the {targetKg} target',
    },
    trips: {
      empty: 'You loaded no trips in this period.',
      loadedOn: 'Loaded on {date}',
      packages: '{count} packages',
    },
    uncalculated: {
      DRAFT: 'Payroll for this period is being calculated. Loaded weight, pay by weight and KPI appear once your manager locks the period.',
      LOCKED: 'This period is locked, but you have no payroll record for this month.',
      none: 'Your manager has not calculated warehouse payroll for this period yet.',
      baseSalary: 'Monthly base salary: {amount}',
    },
  },
} satisfies Dictionary<typeof source>
