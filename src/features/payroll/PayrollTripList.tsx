import { ChevronDown, ChevronUp, Truck } from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

import type { PayrollTripLine } from './payroll-model'
import { PayrollTripCard } from './PayrollTripCard'

const INITIAL_VISIBLE_TRIPS = 5

type PayrollTripListProps = {
  readonly trips: readonly PayrollTripLine[]
}

/** Danh sách chuyến đóng góp thu nhập của tài xế trong kỳ; chạm một chuyến mở chi tiết chuyến. */
export function PayrollTripList({ trips }: PayrollTripListProps) {
  return <PayrollLineList trips={trips} keyOf={(line) => line.tripId} renderLine={(line) => <PayrollTripCard line={line} />} />
}

type PayrollLineListProps<T> = {
  readonly trips: readonly T[]
  readonly keyOf: (line: T) => string
  readonly renderLine: (line: T) => ReactNode
  /** Câu khi kỳ không có chuyến; mặc định là câu của tài xế. */
  readonly empty?: string
}

/** Khung "Chi tiết theo chuyến" dùng chung: mặc định hiện 5 chuyến đầu, mở rộng khi nhiều chuyến; kỳ không có chuyến thì một câu. */
export function PayrollLineList<T>({ trips, keyOf, renderLine, empty }: PayrollLineListProps<T>) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)

  const hasMore = trips.length > INITIAL_VISIBLE_TRIPS
  const visibleTrips = hasMore && !expanded ? trips.slice(0, INITIAL_VISIBLE_TRIPS) : trips
  const hiddenCount = trips.length - INITIAL_VISIBLE_TRIPS

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.headerBadge, { backgroundColor: badgeTones.azure.bg }]}>
          <Truck color={badgeTones.azure.fg} size={18} strokeWidth={1.75} />
        </View>
        <AppText variant="heading" accessibilityRole="header">
          {t('payroll.trips.title', { count: trips.length })}
        </AppText>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText variant="body" color={colors.text3} style={styles.emptyText}>
            {empty ?? t('payroll.trips.empty')}
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleTrips.map((line) => (
            <View key={keyOf(line)}>{renderLine(line)}</View>
          ))}

          {hasMore ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded((prev) => !prev)}
              style={({ pressed }) => [styles.toggleButton, pressed && styles.toggleButtonPressed]}>
              <AppText variant="label" color={colors.primary}>
                {expanded ? t('payroll.trips.showLess') : t('payroll.trips.showMore', { count: hiddenCount })}
              </AppText>
              {expanded ? (
                <ChevronUp color={colors.primary} size={18} strokeWidth={2} />
              ) : (
                <ChevronDown color={colors.primary} size={18} strokeWidth={2} />
              )}
            </Pressable>
          ) : null}
        </View>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderLeftColor: badgeTones.azure.fg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  headerBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: space[2],
  },
  emptyBox: {
    paddingVertical: space[4],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  emptyText: {
    textAlign: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    paddingVertical: space[3],
    borderRadius: radius.md,
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: badgeTones.cyan.border,
  },
  toggleButtonPressed: {
    opacity: 0.75,
  },
})
