import type { ConstraintIssue } from '@/domain/constraints'
import type { CargoPackage } from '@/domain/models'

/**
 * Một kiện vật lý sau khi mở rộng `quantity` (Spec mục 6, D-33). Bộ xếp và constraint engine làm việc trên
 * instance, không trên dòng kiện.
 *
 * Mang mọi trường của kiện gốc mà việc xếp hàng đọc (kích thước, khối lượng, hướng, xếp chồng, điểm giao, ưu tiên), trừ:
 * - `id`: thay bằng `packageInstanceId`, cùng tên trường với `PackagePlacement` và `UnplacedPackage`;
 * - `quantity`: mỗi instance là đúng một kiện;
 * - `name`, `groupId`, `notes`: chỉ để hiển thị.
 *
 * Kiện gốc lấy lại qua `packageIdByInstanceId`, không tách chuỗi ID.
 */
export type PackageInstance = Omit<CargoPackage, 'id' | 'name' | 'quantity' | 'groupId' | 'notes'> & {
  packageInstanceId: string
}

/**
 * Lỗi trùng ID trong request (kiểu dùng chung của LM-014):
 * - `packageInstanceId`: chính ID bị trùng — mã một instance, hoặc mã kiện gốc khi nhiều dòng kiện cùng mã;
 * - `relatedIds`: mã các kiện gốc đang dùng ID này (làm mã của chính nó hoặc mã một instance), theo thứ tự request, không lặp;
 * - `params.occurrences`: số dòng kiện đang dùng ID này.
 */
export type DuplicateInstanceIdIssue = ConstraintIssue<'DUPLICATE_INSTANCE_ID'>

export interface ExpandedPackages {
  /** Theo thứ tự dòng kiện trong request, rồi theo số thứ tự instance. */
  instances: readonly PackageInstance[]
  /** Instance → mã kiện gốc, sinh cùng lúc với ID. */
  packageIdByInstanceId: ReadonlyMap<string, string>
  issues: readonly DuplicateInstanceIdIssue[]
}

/**
 * Mở rộng mỗi dòng kiện thành `quantity` instance trước khi tối ưu (Spec mục 6, D-33).
 *
 * ID instance là `{packageId}-{n}`, n đếm từ 1, đệm 0 tới `max(2, số chữ số của quantity)`:
 * quantity 4 → `-01`…`-04`, quantity 100 → `-001`…`-100`, nên sắp xếp chuỗi giữ đúng thứ tự.
 *
 * Mã kiện gốc và mã instance chung một không gian ID. Mỗi ID mà nhiều dòng kiện cùng dùng sinh một
 * `DUPLICATE_INSTANCE_ID`, ví dụ kiện gốc `PKG-001-01` va với instance đầu của `PKG-001`, hoặc hai dòng cùng mã.
 * Hai dòng cùng mã chỉ báo ở chính mã đó, không báo lại từng instance ID trùng theo.
 *
 * Đầu vào đã hợp lệ theo `cargoPackageSchema` (quantity nguyên ≥ 1).
 */
export function expandPackages(packages: readonly CargoPackage[]): ExpandedPackages {
  const instances: PackageInstance[] = []
  const packageIdByInstanceId = new Map<string, string>()
  /** ID → mã kiện gốc của từng dòng kiện dùng ID đó. */
  const claims = new Map<string, string[]>()
  for (const { id, quantity, name: _name, groupId: _groupId, notes: _notes, ...packing } of packages) {
    claim(claims, id, id)
    const width = Math.max(2, String(quantity).length)
    for (let n = 1; n <= quantity; n++) {
      const packageInstanceId = `${id}-${String(n).padStart(width, '0')}`
      instances.push({ packageInstanceId, ...packing })
      packageIdByInstanceId.set(packageInstanceId, id)
      claim(claims, packageInstanceId, id)
    }
  }
  return { instances, packageIdByInstanceId, issues: duplicateIdIssues(claims) }
}

function claim(claims: Map<string, string[]>, id: string, packageId: string) {
  const owners = claims.get(id)
  if (owners) owners.push(packageId)
  else claims.set(id, [packageId])
}

function duplicateIdIssues(claims: ReadonlyMap<string, string[]>): DuplicateInstanceIdIssue[] {
  return [...claims].flatMap(([id, owners]): DuplicateInstanceIdIssue[] => {
    const relatedIds = [...new Set(owners)]
    // Chỉ mã của chính dòng kiện mới có chủ bằng ID. Một chủ duy nhất khác ID nghĩa là instance ID này chỉ lặp
    // vì nhiều dòng cùng mã kiện — lỗi đó đã báo ở chính mã kiện.
    const repeatsSharedPackageId = relatedIds.length === 1 && relatedIds[0] !== id
    if (owners.length < 2 || repeatsSharedPackageId) return []
    return [
      {
        code: 'DUPLICATE_INSTANCE_ID',
        severity: 'error',
        packageInstanceId: id,
        relatedIds,
        params: { occurrences: owners.length },
      },
    ]
  })
}
