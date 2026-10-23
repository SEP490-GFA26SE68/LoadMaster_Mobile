import { ScanLine } from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { FlatList, Keyboard, RefreshControl, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { isUnknownPackage, type PackageLookup } from './lookup-api'
import { lookupView } from './lookup-model'
import { LookupForm, useLookupForm } from './LookupForm'
import { PackageLookupCard } from './PackageLookupCard'
import { PackageLookupRow } from './PackageLookupRow'
import { ScanPackageSheet } from './ScanPackageSheet'
import { usePackageLookup } from './useLookupQueries'

/**
 * Tab Tra cứu kiện của nhân viên kho (như `PackageLookupPage` của web): quét mã QR — nút chính ở chân màn, mở tờ quét có cả ô nhập mã —
 * hoặc gõ mã QR / mã của bên gửi / mã của kho vào ô đầu màn. Mã không khớp, hay khớp kiện của công ty khác, đều là "Không tìm thấy";
 * nhiều kiện trùng mã của bên gửi thì liệt kê để chọn. **Quét** thấy kiện mang cờ "Không tìm thấy" thì cờ được gỡ ngay; **gõ mã** thì thẻ
 * kiện có nút xác nhận — gõ mã chưa chắc là đang cầm kiện. Tra lại đúng mã đang xem, hay kéo danh sách xuống, là đọc lại kiện: lần đọc lại
 * lỗi thì kết quả đang có ở lại, câu lỗi hiện ngay dưới ô tra; mã không còn khớp kiện nào thì là "Không tìm thấy", không giữ thẻ cũ.
 */
export function PackageLookupScreen() {
  const t = useT()
  const form = useLookupForm()
  const [code, setCode] = useState('')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [foundId, setFoundId] = useState<string | null>(null)
  // Mỗi lần tra là một lượt mới: thẻ kiện dựng lại từ đầu, không mang câu lỗi của lượt trước
  const [round, setRound] = useState(0)
  // Tờ quét dựng lại mỗi lần mở (`key`): ô nhập, câu lỗi và mã vừa đọc bắt đầu trống
  const [scanSheet, setScanSheet] = useState({ open: false, key: 0 })
  const query = usePackageLookup(code)
  const view = lookupView({ code, pickedId, pending: query.isPending, notFound: isUnknownPackage(query.error), data: query.data })
  // Lần đọc lại lỗi mà đã có kết quả: `lookupView` vẫn cho kết quả cũ, nên màn phải nói lỗi ("không khớp" thì màn đã là "Không tìm thấy")
  const rereadFailed = query.isError && query.data !== undefined && !isUnknownPackage(query.error)

  function show(next: string) {
    setPickedId(null)
    setRound((value) => value + 1)
    if (next === code) void query.refetch()
    else setCode(next)
  }

  const submit = form.handleSubmit(({ code: next }) => {
    Keyboard.dismiss()
    setFoundId(null)
    show(next)
  })

  function openScan() {
    Keyboard.dismiss()
    setScanSheet((sheet) => ({ open: true, key: sheet.key + 1 }))
  }

  function closeScan() {
    setScanSheet((sheet) => ({ ...sheet, open: false }))
  }

  function handleScanned(item: PackageLookup, cleared: boolean) {
    closeScan()
    setFoundId(cleared ? item.package.id : null)
    // Ô tra mang mã vừa quét, như khi gõ
    form.reset({ code: item.package.qrToken })
    show(item.package.qrToken)
  }

  let result: ReactNode = null
  if (view.kind === 'idle') {
    result = <EmptyState title={t('lookup.idle.title')} description={t('lookup.idle.description')} />
  } else if (view.kind === 'pending') {
    result = query.isError ? (
      <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
    ) : (
      <LoadingState label={t('lookup.loading')} />
    )
  } else if (view.kind === 'notFound') {
    result = <EmptyState title={t('lookup.notFound.title')} description={t('lookup.notFound.description', { code: view.code })} alert />
  } else if (view.kind === 'one') {
    result = (
      <PackageLookupCard
        key={`${round}:${view.item.package.id}`}
        item={view.item}
        justFound={foundId === view.item.package.id}
        onFound={setFoundId}
        onBack={view.fromMany ? () => setPickedId(null) : undefined}
      />
    )
  }

  return (
    <Screen
      title={t('lookup.title')}
      footer={
        <Button icon={ScanLine} onPress={openScan}>
          {t('lookup.scan')}
        </Button>
      }>
      <FlatList
        data={view.kind === 'many' ? view.items : []}
        keyExtractor={(item) => item.package.id}
        renderItem={({ item }) => <PackageLookupRow item={item} onPress={() => setPickedId(item.package.id)} />}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card>
              <LookupForm form={form} onSubmit={() => void submit()} />
            </Card>
            {rereadFailed ? <Banner tone="danger">{dataErrorMessage(query.error, t)}</Banner> : null}
            {view.kind === 'many' ? (
              <View style={styles.manyHead}>
                <AppText variant="heading" accessibilityRole="header">
                  {t('lookup.many.title', { count: view.items.length, code: view.code })}
                </AppText>
                <AppText color={colors.text2}>{t('lookup.many.hint')}</AppText>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={result}
        ListFooterComponentStyle={styles.footer}
        contentContainerStyle={styles.list}
        refreshControl={
          code === '' ? undefined : <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />
        }
        // Bàn phím đang mở: lần chạm đầu vào nút vẫn bấm nút, không chỉ đóng bàn phím
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
      <ScanPackageSheet key={scanSheet.key} open={scanSheet.open} onClose={closeScan} onScanned={handleScanned} />
    </Screen>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  header: { gap: space[4], marginBottom: space[4] },
  manyHead: { gap: space[1] },
  footer: { flexGrow: 1 },
  separator: { height: space[3] },
})
