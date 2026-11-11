import { useState } from 'react'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { FilterChips, type FilterChip } from '@/components/FilterChips'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { calendarDate } from '@/lib/calendar-date'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import { DEFAULT_PERIOD, type DateRange, type PeriodPreset } from './dashboard-period'
import type { DashboardSummary } from './dashboard-summary'
import { FleetCard } from './overview/FleetCard'
import { KpiTiles } from './overview/KpiTiles'
import { RecentTripsCard } from './overview/RecentTripsCard'
import { StatusCountsCard } from './overview/StatusCountsCard'
import { useDashboard, useDashboardCapabilities, useRefreshDashboard } from './useDashboardQueries'

/** Ba kỳ có sẵn của web; kỳ tuỳ chọn (hai ô ngày) chưa có trên điện thoại. */
type QuickPreset = Exclude<PeriodPreset, 'tuy-chon'>

const PRESET_LABEL = { '7-ngay': 'last7', '30-ngay': 'last30', 'thang-nay': 'thisMonth' } as const satisfies Record<QuickPreset, string>

const QUICK_PRESETS: readonly QuickPreset[] = ['7-ngay', '30-ngay', 'thang-nay']

/** Kỳ mặc định của web (30 ngày). */
const DEFAULT_PRESET: QuickPreset = QUICK_PRESETS.find((value) => value === DEFAULT_PERIOD) ?? '30-ngay'

/**
 * Tab Tổng quan của quản lý công ty (bảng điều khiển của web, phần đọc, một cột cho điện thoại): kỳ báo cáo (7 ngày · 30 ngày · tháng
 * này, mặc định 30 ngày; khoảng ngày của kỳ nằm dưới tiêu đề), năm số của kỳ kèm nguồn, chuyến theo trạng thái thành danh sách số (không
 * biểu đồ), trạng thái đội xe, rồi tối đa mười chuyến gần nhất — chạm mở Chi tiết chuyến khi màn chuyến cùng nguồn. Kỳ không có chuyến
 * thì một câu thay ba thẻ của chuyến, thẻ đội xe vẫn hiện (không theo kỳ). Không xuất báo cáo, không "so với kỳ trước", không số nghĩ ra;
 * màn không có nút chính. Mỗi kỳ đọc một lần (máy chủ tính số theo kỳ); đổi kỳ giữ số cũ tới khi số mới về. Kéo xuống để đọc lại; lỗi đọc
 * lại khi đã có số thì giữ số, kèm một dải lỗi ở đầu.
 */
export function OverviewScreen() {
  const t = useT()
  const format = useFormat()
  const [preset, setPreset] = useState<QuickPreset>(DEFAULT_PRESET)
  const query = useDashboard({ preset, from: '', to: '' })
  const refresh = useRefreshDashboard()
  const summary = query.data
  const chips: FilterChip<QuickPreset>[] = QUICK_PRESETS.map((value) => ({ value, label: t(`manager.period.presets.${PRESET_LABEL[value]}`) }))

  return (
    <Screen
      title={t('overview.title')}
      actions={<NotificationBell />}
      below={summary ? <PeriodRange range={summary.period} /> : undefined}
      scroll
      refresh={refresh}>
      {summary && query.isError ? <Banner tone="danger">{dataErrorMessage(query.error, t)}</Banner> : null}
      <FilterChips label={t('manager.period.label')} chips={chips} selected={preset} onPress={setPreset} formatCount={format.integer} />
      {summary ? (
        <Content summary={summary} />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <LoadingState label={t('manager.loading')} />
      )}
    </Screen>
  )
}

function Content({ summary }: { summary: DashboardSummary }) {
  const t = useT()
  const { tripLinks } = useDashboardCapabilities()
  if (summary.tripCount === 0) {
    return (
      <>
        <KpiTiles summary={summary} />
        <EmptyState title={t('manager.empty.title')} description={t('overview.emptyDescription')} />
        <FleetCard vehicles={summary.vehicles} />
      </>
    )
  }
  return (
    <>
      <KpiTiles summary={summary} />
      <StatusCountsCard entries={summary.tripsByStatus} total={summary.tripCount} />
      <FleetCard vehicles={summary.vehicles} />
      <RecentTripsCard trips={summary.trips} total={summary.tripCount} linked={tripLinks} />
    </>
  )
}

/** Khoảng ngày của kỳ đang chọn, dưới tiêu đề; đổi kỳ thì trình đọc màn hình đọc khoảng mới. */
function PeriodRange({ range }: { range: DateRange }) {
  const t = useT()
  const format = useFormat()
  const text = t('manager.period.range', { from: format.date(calendarDate(range.from)), to: format.date(calendarDate(range.to)) })
  return (
    <AppText color={colors.skyText2} accessibilityLabel={`${t('manager.period.label')}: ${text}`} accessibilityLiveRegion="polite">
      {text}
    </AppText>
  )
}
