import { Plus, X } from 'lucide-react-native'
import { Controller, useFieldArray, type FieldErrors, type UseFormReturn } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { ChoiceGroup } from '@/components/ChoiceGroup'
import { IconButton } from '@/components/IconButton'
import { TextField } from '@/components/TextField'
import { HANDLING_CLASSES } from '@/domain/models'
import { useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import { emptyPackage, MAX_CODE, type PickupFormValues } from './pickup-form'
import { pickupErrorText } from './pickup-form-schema'

/** Bốn ô số của một kiện kèm nhãn của chúng (`pickups.dialog.packages.*`), hai ô một hàng. */
const SIZE_ROWS = [
  [
    ['lengthCm', 'length'],
    ['widthCm', 'width'],
  ],
  [
    ['heightCm', 'height'],
    ['weightKg', 'weight'],
  ],
] as const

/**
 * Danh sách kiện nhận của form (như `PackageRow` của web): mỗi kiện là một khung có mã của bên gửi, dài · rộng · cao (cm), khối lượng (kg)
 * và loại hàng; còn hơn một kiện thì bỏ được từng kiện. "Thêm kiện" thêm một khung trống ở cuối.
 */
export function PickupPackageRows({ form }: { form: UseFormReturn<PickupFormValues> }) {
  const t = useT()
  const fields = useFieldArray({ control: form.control, name: 'packages' })
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {t('pickups.dialog.packages.title')}
      </AppText>
      {fields.fields.map((field, index) => (
        <PackageRow key={field.id} index={index} form={form} removable={fields.fields.length > 1} onRemove={() => fields.remove(index)} />
      ))}
      <Button variant="secondary" icon={Plus} onPress={() => fields.append(emptyPackage())}>
        {t('pickups.dialog.packages.add')}
      </Button>
    </View>
  )
}

function packageErrors(errors: FieldErrors<PickupFormValues>, index: number) {
  return Array.isArray(errors.packages) ? errors.packages[index] : undefined
}

function PackageRow({ index, form, removable, onRemove }: { index: number; form: UseFormReturn<PickupFormValues>; removable: boolean; onRemove: () => void }) {
  const t = useT()
  const number = index + 1
  const errors = packageErrors(form.formState.errors, index)
  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <AppText variant="label" color={colors.text2} style={styles.flex} accessibilityRole="header">
          {t('pickups.dialog.packages.row', { number })}
        </AppText>
        {removable ? <IconButton icon={X} label={t('pickups.dialog.packages.remove', { number })} onPress={onRemove} /> : null}
      </View>
      <Controller
        control={form.control}
        name={`packages.${index}.packageCode`}
        render={({ field }) => (
          <TextField
            label={t('pickups.dialog.packages.code')}
            code
            autoCapitalize="characters"
            autoCorrect={false}
            error={pickupErrorText(errors?.packageCode?.message, MAX_CODE, t)}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      {SIZE_ROWS.map((pair) => (
        <View key={pair[0][0]} style={styles.pair}>
          {pair.map(([name, key]) => (
            <View key={name} style={styles.half}>
              <Controller
                control={form.control}
                name={`packages.${index}.${name}`}
                render={({ field }) => (
                  <TextField
                    label={t(`pickups.dialog.packages.${key}`)}
                    code
                    keyboardType="decimal-pad"
                    error={pickupErrorText(errors?.[name]?.message, 0, t)}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </View>
          ))}
        </View>
      ))}
      <Controller
        control={form.control}
        name={`packages.${index}.handlingClass`}
        render={({ field }) => (
          <ChoiceGroup
            label={t('pickups.dialog.packages.handlingClass')}
            choices={HANDLING_CLASSES.map((value) => ({ value, label: t(`common.handlingClasses.${value}`) }))}
            value={field.value}
            onChange={field.onChange}
            columns={2}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
  row: { gap: space[3], padding: space[3], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: space[3] },
  half: { flex: 1, minWidth: 0 },
})
