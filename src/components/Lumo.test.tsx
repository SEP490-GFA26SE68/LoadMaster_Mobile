import { screen } from '@testing-library/react-native'
import { renderApp } from '@/test/render'
import { Lumo, LUMO_GREET_BASE64 } from './Lumo'

describe('Lumo mascot component', () => {
  it('has a valid, full-length WebP base64 payload', () => {
    expect(LUMO_GREET_BASE64.length).toBe(29904)
    expect(LUMO_GREET_BASE64.startsWith('UklGRpRXAABXRUJQVlA4')).toBe(true)
    expect(LUMO_GREET_BASE64.endsWith('AAAA')).toBe(true)
  })

  it('renders correctly with given accessibility label and default size', async () => {
    await renderApp(<Lumo accessibilityLabel="Lumo Mascot" />)
    const image = screen.getByLabelText('Lumo Mascot')
    expect(image).toBeOnTheScreen()
    expect(image.props.source).toEqual({
      uri: `data:image/webp;base64,${LUMO_GREET_BASE64}`,
    })
  })

  it('renders with custom numeric size', async () => {
    await renderApp(<Lumo size={72} accessibilityLabel="Lumo Greet" />)
    const image = screen.getByLabelText('Lumo Greet')
    expect(image).toBeOnTheScreen()
  })
})
