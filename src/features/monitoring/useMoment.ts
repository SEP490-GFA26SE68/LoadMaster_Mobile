import { useFormat, useT } from '@/lib/i18n'

/** Giờ kèm ngày của một mốc ("14:30 14/09"), như `useMoment` của web: mốc của giám sát có thể sang ngày khác. */
export function useMoment(): (iso: string) => string {
  const t = useT()
  const format = useFormat()
  return (iso) => t('monitoring.moment', { time: format.time(iso), date: format.dayMonth(iso) })
}
