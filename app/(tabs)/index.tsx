// app/(tabs)/index.tsx - Ruta por defecto que redirige al calendario
import { useEffect } from 'react'
import { router } from 'expo-router'

export default function TabsIndex() {
  useEffect(() => {
    // Redirigir automáticamente al calendario como página por defecto
    router.replace('/calendario')
  }, [])

  return null
}