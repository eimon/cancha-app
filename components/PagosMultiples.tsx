// components/PagosMultiples.tsx - Componente para manejar pagos múltiples
import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { showAlert } from '../lib/alerts'
import { Button, Card, Text, TextInput, IconButton } from 'react-native-paper'
import { Picker } from '@react-native-picker/picker'

interface PagoItem {
  id: string
  metodo: 'efectivo' | 'mercadopago'
  monto: number
}

interface PagosMultiplesProps {
  total: number
  onPagosChange: (pagos: PagoItem[]) => void
  disabled?: boolean
}

export default function PagosMultiples({ total, onPagosChange, disabled = false }: PagosMultiplesProps) {
  const [pagos, setPagos] = useState<PagoItem[]>([])
  const [nuevoMetodo, setNuevoMetodo] = useState<'efectivo' | 'mercadopago'>('efectivo')
  const [nuevoMonto, setNuevoMonto] = useState('')

  const agregarPago = () => {
    const monto = parseFloat(nuevoMonto)
    
    if (isNaN(monto) || monto <= 0) {
      showAlert('Error', 'El monto debe ser un número válido mayor a 0')
      return
    }

    const totalActual = pagos.reduce((sum, pago) => sum + pago.monto, 0)
    
    if (totalActual + monto > total) {
      showAlert('Error', `El monto excede el total. Restante: $${(total - totalActual).toFixed(2)}`)
      return
    }

    const nuevoPago: PagoItem = {
      id: Date.now().toString(),
      metodo: nuevoMetodo,
      monto: monto
    }

    const nuevosPagos = [...pagos, nuevoPago]
    setPagos(nuevosPagos)
    onPagosChange(nuevosPagos)
    setNuevoMonto('')
  }

  const eliminarPago = (id: string) => {
    const nuevosPagos = pagos.filter(pago => pago.id !== id)
    setPagos(nuevosPagos)
    onPagosChange(nuevosPagos)
  }

  const getTotalPagado = () => {
    return pagos.reduce((sum, pago) => sum + pago.monto, 0)
  }

  const getRestante = () => {
    return total - getTotalPagado()
  }

  const pagoCompleto = () => {
    return Math.abs(getRestante()) < 0.01 // Consideramos completo si la diferencia es menor a 1 centavo
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>💳 Métodos de Pago</Text>
      
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <Text variant="titleSmall">Total a pagar:</Text>
            <Text variant="titleMedium" style={styles.totalText}>${total.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="titleSmall">Total pagado:</Text>
            <Text variant="titleMedium" style={styles.paidText}>${getTotalPagado().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="titleSmall">Restante:</Text>
            <Text 
              variant="titleMedium" 
              style={[styles.remainingText, pagoCompleto() && styles.completedText]}
            >
              ${getRestante().toFixed(2)}
            </Text>
          </View>
          {pagoCompleto() && (
            <Text style={styles.completedMessage}>✅ Pago completo</Text>
          )}
        </Card.Content>
      </Card>

      {!pagoCompleto() && (
        <Card style={styles.addPaymentCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>Agregar Pago</Text>
            
            <Text style={styles.label}>Método de pago:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={nuevoMetodo}
                onValueChange={(itemValue) => setNuevoMetodo(itemValue)}
                enabled={!disabled}
              >
                <Picker.Item label="💵 Efectivo" value="efectivo" />
                <Picker.Item label="💳 MercadoPago" value="mercadopago" />
              </Picker>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                label={`Monto (máx: $${getRestante().toFixed(2)})`}
                value={nuevoMonto}
                onChangeText={setNuevoMonto}
                style={styles.input}
                keyboardType="numeric"
                disabled={disabled}
                right={<TextInput.Affix text="$" />}
              />
              <Button
                mode="outlined"
                onPress={() => setNuevoMonto(getRestante().toFixed(2))}
                style={styles.maxButton}
                disabled={disabled || getRestante() <= 0}
                compact
              >
                Usar máx
              </Button>
            </View>

            <Button
              mode="contained"
              onPress={agregarPago}
              style={styles.addButton}
              disabled={disabled || !nuevoMonto || getRestante() <= 0}
            >
              Agregar Pago
            </Button>
          </Card.Content>
        </Card>
      )}

      {pagos.length > 0 && (
        <View style={styles.paymentsSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Pagos Registrados</Text>
          {pagos.map((pago) => (
            <Card key={pago.id} style={styles.paymentCard}>
              <Card.Content>
                <View style={styles.paymentRow}>
                  <View style={styles.paymentInfo}>
                    <Text variant="titleSmall">
                      {pago.metodo === 'efectivo' ? '💵 Efectivo' : '💳 MercadoPago'}
                    </Text>
                    <Text variant="titleMedium" style={styles.paymentAmount}>
                      ${pago.monto.toFixed(2)}
                    </Text>
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => eliminarPago(pago.id)}
                    disabled={disabled}
                    iconColor="#dc2626"
                  />
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    marginBottom: 15,
    color: '#1e293b',
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalText: {
    color: '#1e293b',
    fontWeight: '700',
  },
  paidText: {
    color: '#059669',
    fontWeight: '600',
  },
  remainingText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  completedText: {
    color: '#059669',
  },
  completedMessage: {
    textAlign: 'center',
    color: '#059669',
    fontWeight: '600',
    marginTop: 10,
    fontSize: 16,
  },
  addPaymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    marginBottom: 15,
    color: '#1e293b',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#374151',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
  },
  maxButton: {
    marginBottom: 8,
    borderColor: '#2563eb',
    borderRadius: 6,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  paymentsSection: {
    marginTop: 10,
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    color: '#059669',
    fontWeight: '700',
  },
})