/* eslint-disable no-undef */
import { getLongLat } from '../geolocation.services'

test('mismatched postcode and address return undefined', async () => {
  await expect(getLongLat({ address_line_1: '2 Eversley Road', postcode: 'M44 3G' })).resolves.toBeFalsy()
})

test('mismatched postcode and address return undefined', async () => {
  await expect(getLongLat({ address_line_1: '2 Eversley Road', postcode: 'M44' })).resolves.toBeTruthy()
})

test('mismatched postcode and address return undefined', async () => {
  await expect(getLongLat({ address_line_1: '2 Eversley Road', postcode: 'M20 2FL' })).resolves.toBeTruthy()
})

test('mismatched postcode and address return undefined', async () => {
  await expect(getLongLat({ address_line_1: '2 Eversley Road', postcode: '23123' })).resolves.toBeTruthy()
})
