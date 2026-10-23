/** Bước Xếp hàng của phiên kho (`LoadingStepView`): câu chỉ mobile cần, ngoài nhánh `warehouse` chép từ web — chú giải của sơ đồ thùng. */
export const warehouseLoading = {
  /** Chú giải của sơ đồ thùng nhìn từ trên (bản điện thoại thay khung 3D của web). Cả sơ đồ ẩn với trình đọc màn hình: thẻ đã nói bằng chữ. */
  sketch: { current: 'Kiện đang xếp', loaded: 'Đã lên xe', obstacle: 'Vật cản' },
} as const
