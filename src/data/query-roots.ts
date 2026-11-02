/**
 * Gốc khoá truy vấn của các màn điều phối viên và quản lý công ty: `trips` (danh sách, chi tiết chuyến, việc chờ duyệt), `monitoring`
 * (giám sát, sự cố, nhận hàng dọc đường, thông báo của hai vai trò), `dashboard` (số liệu của quản lý). Khoá của mỗi feature nằm dưới gốc
 * của nó. Một lệnh ghi ở màn này đổi dữ liệu màn kia đang hiện (duyệt xác nhận tay đổi chuyến đang giám sát, báo sự cố đổi dòng phụ của
 * danh sách chuyến…), nên lệnh ghi của hai vai trò làm mới cả ba gốc: chờ khoá của chính màn đang hiện, các gốc khác làm mới ngầm — như
 * lệnh ghi của kho (`useWarehouseQueries.ts`).
 */
export const OFFICE_QUERY_ROOTS = [['trips'], ['monitoring'], ['dashboard']] as const
