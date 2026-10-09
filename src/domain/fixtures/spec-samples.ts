import type { CargoPackage, PackagePlacement, VehicleConfig } from '@/domain/models'

/**
 * Dữ liệu mẫu Spec mục 12, giữ nguyên từng giá trị (cm, kg).
 * Dùng chung cho test domain, mock service (LM-024) và seed (LM-026); không sửa tại chỗ.
 */

/** Xe "Truck 6m": lòng thùng 600 × 240 × 250 cm, tải 5.000 kg, một hốc bánh xe không chịu tải ở góc trong – trái. */
export const SPEC_TRUCK_6M: VehicleConfig = {
  id: 'VEHICLE-001',
  name: 'Truck 6m',
  innerLengthCm: 600,
  innerWidthCm: 240,
  innerHeightCm: 250,
  maxPayloadKg: 5000,
  doorWidthCm: 220,
  doorHeightCm: 230,
  doorPosition: 'REAR',
  clearanceCm: 0,
  obstacles: [
    {
      id: 'OBS-001',
      type: 'WHEEL_ARCH',
      xCm: 0,
      yCm: 0,
      zCm: 0,
      lengthCm: 120,
      widthCm: 30,
      heightCm: 45,
      loadBearing: false,
    },
  ],
}

/** Kiện "Carton A": 120 × 60 × 45 cm, 30 kg, 4 kiện, giữ đứng, chịu tải 90 kg, giao ở điểm 2. */
export const SPEC_CARTON_A: CargoPackage = {
  id: 'PKG-001',
  name: 'Carton A',
  lengthCm: 120,
  widthCm: 60,
  heightCm: 45,
  weightKg: 30,
  quantity: 4,
  allowedOrientations: ['LWH', 'WLH'],
  keepUpright: true,
  fragilityLevel: 'LOW',
  stackable: true,
  maxTopLoadKg: 90,
  maxStackCount: 3,
  minSupportRatio: 0.8,
  deliveryStop: 2,
  priority: 1,
  mustLoad: true,
}

/** Instance đầu tiên của Carton A, hướng LWH, đặt sát sau hốc bánh xe (x = 120). */
export const SPEC_CARTON_A_PLACEMENT: PackagePlacement = {
  packageInstanceId: 'PKG-001-01',
  orientation: 'LWH',
  xCm: 120,
  yCm: 0,
  zCm: 0,
  placedLengthCm: 120,
  placedWidthCm: 60,
  placedHeightCm: 45,
  loadingOrder: 1,
  unloadingOrder: 4,
  supportRatio: 1,
  constraintWarnings: [],
}
