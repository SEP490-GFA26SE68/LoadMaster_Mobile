import {
  filterTripRows,
  needsAction,
  TRIP_LIST_FILTERS,
  TRIP_LIST_TABS,
  tripsPerDate,
  tripTabCounts,
  type TripListFilter,
  type TripListTab,
  type TripRow,
} from '../trip-list'

/** Một nhóm của danh sách chuyến: các chuyến cùng ngày chạy. */
export type TripDateSection = {
  /** Ngày chạy `YYYY-MM-DD`. */
  readonly date: string
  /** Số chuyến của ngày đó trong danh sách đang hiện (`tripsPerDate`). */
  readonly count: number
  readonly data: TripRow[]
}

/** Bộ lọc của web chỉ còn trạng thái: điện thoại bỏ lọc ngày, xe, tài xế (việc của bản web). */
function statusFilter(status: string): Record<TripListFilter, string> {
  const filters = Object.fromEntries(TRIP_LIST_FILTERS.map((name) => [name, ''])) as Record<TripListFilter, string>
  return { ...filters, 'trang-thai': status }
}

/** Giá trị `trang-thai` của một tab (`''` là Tất cả). */
export function tabValue(tab: TripListTab): string {
  return TRIP_LIST_TABS.find(({ key }) => key === tab)?.value ?? ''
}

/** Kết quả tìm và lọc của danh sách: dòng đang hiện, số trên từng tab và số "cần bạn xử lý". */
export type TripListView = {
  readonly rows: TripRow[]
  readonly tabCounts: Record<TripListTab, number>
  /** Chuyến khớp ô tìm mà phương án chờ duyệt hoặc lỗi thời (`needsAction`): số hổ phách trên tab Đã lập kế hoạch, như web. */
  readonly needAction: number
}

/**
 * Tìm (bỏ dấu, như web) và lọc theo tab trạng thái. Số trên tab đếm trên các dòng khớp ô tìm, chưa lọc trạng thái — như hàng tab
 * của web, để người dùng thấy mỗi tab còn bao nhiêu chuyến khớp.
 */
export function tripListView(rows: readonly TripRow[], query: string, tab: TripListTab): TripListView {
  const searched = filterTripRows(rows, query, statusFilter(''))
  return {
    rows: tab === 'all' ? searched : filterTripRows(searched, '', statusFilter(tabValue(tab))),
    tabCounts: tripTabCounts(searched),
    needAction: searched.filter(needsAction).length,
  }
}

/**
 * Nhóm chuyến theo ngày chạy, ngày mới nhất trước như bản web (sắp ổn định: trong cùng ngày giữ thứ tự của kho). Số ở tiêu đề nhóm
 * đếm trên các dòng đang hiện.
 */
export function tripDateSections(rows: readonly TripRow[]): TripDateSection[] {
  const sorted = [...rows].sort((a, b) => (a.scheduledDate === b.scheduledDate ? 0 : a.scheduledDate < b.scheduledDate ? 1 : -1))
  const counts = tripsPerDate(sorted)
  const sections: TripDateSection[] = []
  for (const row of sorted) {
    const last = sections.at(-1)
    if (last?.date === row.scheduledDate) last.data.push(row)
    else sections.push({ date: row.scheduledDate, count: counts.get(row.scheduledDate) ?? 0, data: [row] })
  }
  return sections
}
