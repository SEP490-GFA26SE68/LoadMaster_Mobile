import { MapPin } from 'lucide-react-native'
import { useState } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { coordinateText } from '@/components/map/coordinates'
import { placeAddress, searchPlaces } from '@/components/map/place-search'
import { TextField } from '@/components/TextField'
import { useT } from '@/lib/i18n'
import { SEED_PLACES, type Place } from '@/lib/mock-db'
import { colors, radius, space, TOUCH } from '@/theme/tokens'

import { MAX_ADDRESS, MAX_NAME, type PickupFormValues } from './pickup-form'
import { pickupErrorText } from './pickup-form-schema'

type PointFieldsProps = {
  prefix: 'pickup' | 'delivery'
  form: UseFormReturn<PickupFormValues>
}

/**
 * Điểm nhận hoặc điểm giao của form nhận hàng (như `PointFields` của web): tên, địa chỉ, rồi toạ độ — tìm một địa danh mẫu để điền sẵn
 * (toạ độ mẫu gần đúng ở mức khu vực; tên và địa chỉ còn trống thì điền theo địa danh) hoặc gõ tay vĩ độ, kinh độ. Bản web có thêm bản
 * đồ để bấm chọn; điện thoại chưa có bản đồ.
 */
export function PickupPointFields({ prefix, form }: PointFieldsProps) {
  const t = useT()
  const errors = form.formState.errors[prefix]
  const coordinatesError = pickupErrorText(errors?.coordinates?.message, 0, t)

  const pick = (place: Place) => {
    const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted }
    form.setValue(`${prefix}.coordinates`, coordinateText(place.lat, place.lng), options)
    if (form.getValues(`${prefix}.address`).trim() === '') form.setValue(`${prefix}.address`, placeAddress(place), options)
    if (form.getValues(`${prefix}.name`).trim() === '') form.setValue(`${prefix}.name`, place.name, options)
  }

  return (
    <View style={styles.point}>
      <AppText variant="heading" accessibilityRole="header">
        {t(`pickups.dialog.${prefix}Point`)}
      </AppText>
      <Controller
        control={form.control}
        name={`${prefix}.name`}
        render={({ field, fieldState }) => (
          <TextField
            label={t('pickups.dialog.name')}
            error={pickupErrorText(fieldState.error?.message, MAX_NAME, t)}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <Controller
        control={form.control}
        name={`${prefix}.address`}
        render={({ field, fieldState }) => (
          <TextField
            label={t('pickups.dialog.address')}
            error={pickupErrorText(fieldState.error?.message, MAX_ADDRESS, t)}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <PlaceSearch onPick={pick} />
      <Controller
        control={form.control}
        name={`${prefix}.coordinates`}
        render={({ field }) => (
          <View style={styles.coordinates}>
            <View style={styles.half}>
              <TextField
                label={t('pickupRequest.latitude')}
                code
                keyboardType="numbers-and-punctuation"
                value={field.value.lat}
                onChangeText={(lat) => field.onChange({ ...field.value, lat })}
                onBlur={field.onBlur}
              />
            </View>
            <View style={styles.half}>
              <TextField
                label={t('pickupRequest.longitude')}
                code
                keyboardType="numbers-and-punctuation"
                value={field.value.lng}
                onChangeText={(lng) => field.onChange({ ...field.value, lng })}
                onBlur={field.onBlur}
              />
            </View>
          </View>
        )}
      />
      {coordinatesError === undefined ? (
        <AppText color={colors.text3}>{t('pickupRequest.coordinatesHint')}</AppText>
      ) : (
        <AppText color={colors.danger} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {coordinatesError}
        </AppText>
      )}
    </View>
  )
}

/** Tìm địa danh mẫu (`SEED_PLACES`): tối đa tám gợi ý dưới ô; chọn một là điền toạ độ và nói đã điền. */
function PlaceSearch({ onPick }: { onPick: (place: Place) => void }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const matches = searchPlaces(SEED_PLACES, query)
  return (
    <View style={styles.search}>
      <TextField
        label={t('pickupRequest.place.search')}
        hint={t('pickupRequest.place.hint')}
        autoCorrect={false}
        returnKeyType="search"
        value={query}
        onChangeText={(text) => {
          setQuery(text)
          setChosen(null)
        }}
      />
      {query.trim() !== '' && matches.length === 0 ? <AppText color={colors.text2}>{t('pickupRequest.place.none')}</AppText> : null}
      {matches.length === 0 ? null : (
        <View style={styles.matches}>
          {matches.map((place, index) => (
            <Pressable
              key={place.id}
              accessibilityRole="button"
              accessibilityLabel={t('pickupRequest.place.choose', { name: place.name, region: place.region })}
              onPress={() => {
                onPick(place)
                setQuery('')
                setChosen(place.name)
              }}
              style={({ pressed }) => [styles.match, index > 0 && styles.divider, pressed && styles.pressed]}>
              <MapPin color={colors.text3} size={20} strokeWidth={1.5} />
              <View style={styles.flex}>
                <AppText variant="label">{place.name}</AppText>
                <AppText color={colors.text2}>{place.region}</AppText>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {chosen === null ? null : (
        <AppText color={colors.text2} accessibilityLiveRegion="polite">
          {t('pickupRequest.place.chosen', { name: chosen })}
        </AppText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  point: { gap: space[3] },
  search: { gap: space[2] },
  matches: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  match: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[3], paddingVertical: space[2] },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  pressed: { backgroundColor: colors.surface },
  flex: { flex: 1, minWidth: 0 },
  coordinates: { flexDirection: 'row', gap: space[3] },
  half: { flex: 1, minWidth: 0 },
})
