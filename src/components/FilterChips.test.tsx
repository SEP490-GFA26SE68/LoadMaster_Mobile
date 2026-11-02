import { fireEvent, render, screen } from '@testing-library/react-native'

import { FilterChips } from './FilterChips'

const format = (count: number) => String(count)

describe('FilterChips', () => {
  test('chọn một: mỗi ô là tab, ô đang chọn được đánh dấu; số đếm đọc cùng nhãn', async () => {
    const onPress = jest.fn()
    await render(
      <FilterChips
        label="Trạng thái"
        chips={[
          { value: 'all', label: 'Tất cả', count: 15 },
          { value: 'planned', label: 'Đã lập kế hoạch', count: 4, warnCount: 2 },
        ]}
        selected="all"
        onPress={onPress}
        formatCount={format}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Tất cả 15', selected: true })).toBeOnTheScreen()
    expect(screen.getByRole('tab', { name: 'Đã lập kế hoạch 4 2', selected: false })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('tab', { name: 'Đã lập kế hoạch 4 2' }))
    expect(onPress).toHaveBeenCalledWith('planned')
  })

  test('bật tắt độc lập: mỗi ô là checkbox, ô đang bật được đánh dấu', async () => {
    await render(
      <FilterChips
        label="Bộ lọc"
        chips={[
          { value: 'late', label: 'Nguy cơ trễ' },
          { value: 'issues', label: 'Có sự cố' },
        ]}
        selected={['issues']}
        onPress={() => {}}
        formatCount={format}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'Nguy cơ trễ', checked: false })).toBeOnTheScreen()
    expect(screen.getByRole('checkbox', { name: 'Có sự cố', checked: true })).toBeOnTheScreen()
  })
})
