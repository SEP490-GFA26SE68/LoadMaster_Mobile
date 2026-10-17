import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useState } from 'react'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { TextField } from '@/components/TextField'
import { QrScanner } from '@/features/driver/QrScanner'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import { useScanPackage } from './useWarehouseQueries'

export function PackageScanScreen() {
  const t = useT()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState('')
  const query = useScanPackage(lookup)

  return (
    <Screen
      title={t('warehouse.scan.title')}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={() => router.back()} />}
      scroll>
      <AppText color={colors.text2}>{t('warehouse.scan.hint')}</AppText>
      <QrScanner onDetected={(value) => setLookup(value)} />
      <TextField label={t('warehouse.scan.code')} value={code} onChangeText={setCode} autoCapitalize="characters" code />
      <Button variant="secondary" disabled={code.trim() === ''} onPress={() => setLookup(code.trim())}>
        {t('warehouse.scan.submit')}
      </Button>
      {lookup === '' ? null : query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : query.data === undefined ? null : (
        <ScanResult data={query.data} />
      )}
    </Screen>
  )
}

function ScanResult({ data }: { data: { code: string; status: string; destination: string; weightKg?: number; tripCode?: string; stopNumber?: number; stopName?: string } }) {
  const t = useT()
  const format = useFormat()
  return (
    <Card>
      <AppText variant="heading">{data.code}</AppText>
      <AppText color={colors.text2}>{data.status}</AppText>
      {data.destination === '' ? null : (
        <AppText>
          {t('warehouse.scan.destination')}: {data.destination}
        </AppText>
      )}
      {data.weightKg === undefined ? null : <AppText color={colors.text2}>{t('warehouse.scan.weight', { weight: format.weight(data.weightKg) })}</AppText>}
      {data.tripCode === undefined ? null : <AppText color={colors.text2}>{t('warehouse.scan.trip', { tripId: data.tripCode })}</AppText>}
      {data.stopNumber === undefined ? null : (
        <AppText color={colors.text2}>{t('warehouse.scan.stop', { number: data.stopNumber, name: data.stopName ?? String(data.stopNumber) })}</AppText>
      )}
    </Card>
  )
}

