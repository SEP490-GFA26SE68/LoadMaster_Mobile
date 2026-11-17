import { ChevronDown, ChevronUp, Truck } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import type { PayrollTripLine } from './payroll-model'
import { PayrollTripCard } from './PayrollTripCard'

const INITIAL_VISIBLE_TRIPS = 5

type PayrollTripListProps = {
  readonly trips: readonly PayrollTripLine[]
}

/** Danh sách chuyến đóng góp thu nhập trong kỳ: mặc định hiện 5 chuyến đầu, mở rộng khi nhiều chuyến. */
export function PayrollTripList({ trips }: PayrollTripListProps) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)

  const hasMore = trips.length > INITIAL_VISIBLE_TRIPS
  const visibleTrips = hasMore && !expanded ? trips.slice(0, INITIAL_VISIBLE_TRIPS) : trips
  const hiddenCount = trips.length - INITIAL_VISIBLE_TRIPS

  return (
    <Card>
      <View style={styles.header}>
        <Truck color={colors.primary} size={20} strokeWidth={1.75} />
        <AppText variant="heading" accessibilityRole="header">
          {t('payroll.trips.title', { count: trips.length })}
        </AppText>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText variant="body" color={colors.text3} style={styles.emptyText}>
            {t('payroll.trips.empty')}
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleTrips.map((line) => (
            <PayrollTripCard key={line.tripId} line={line} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
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
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  toggleButtonPressed: {
    opacity: 0.75,
  },
})
