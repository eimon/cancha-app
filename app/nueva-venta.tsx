// app/nueva-venta.tsx - Pantalla nueva venta
import { Picker } from '@react-native-picker/picker'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { showAlert } from '../lib/alerts'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card, IconButton, Text, TextInput } from 'react-native-paper'
import { Producto, Reserva, supabase } from '../lib/supabase'
import PagosMultiples from '../components/PagosMultiples'

interface ItemVenta {
  producto_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

interface PagoItem {
  id: string
  metodo: 'efectivo' | 'mercadopago'
  monto: number
}

export default function NuevaVentaScreen() {
  const { tipo, reservaId: reservaIdParam } = useLocalSearchParams()
  const [productos, setProductos] = useState<Producto[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [selectedProducto, setSelectedProducto] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [items, setItems] = useState<ItemVenta[]>([])
  const [pagos, setPagos] = useState<PagoItem[]>([])
  const [reservaId, setReservaId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [reservaBloqueada, setReservaBloqueada] = useState(false)

  useEffect(() => {
    cargarProductos()
    obtenerUsuarioActual()
    if (tipo === 'cancha_cumpleanos') {
      cargarReservas()
    }
    
    // Si viene una reserva preseleccionada desde el calendario
    if (reservaIdParam) {
      setReservaId(reservaIdParam as string)
      setReservaBloqueada(true)
    }
  }, [tipo, reservaIdParam])

  const obtenerUsuarioActual = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const cargarProductos = async () => {
    let query = supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (tipo === 'bebidas' || tipo === 'kiosco') {
      query = query.eq('categoria', tipo)
    }

    const { data, error } = await query

    if (error) {
      showAlert('Error', 'No se pudieron cargar los productos')
    } else {
      setProductos(data || [])
    }
  }

  const cargarReservas = async () => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*, canchas(nombre)')
      .eq('pagada', false)
      .order('fecha')

    if (error) {
      showAlert('Error', 'No se pudieron cargar las reservas')
    } else {
      setReservas(data || [])
    }
  }

  const agregarItem = () => {
    if (!selectedProducto || !cantidad) {
      showAlert('Error', 'Selecciona un producto y cantidad')
      return
    }

    const producto = productos.find(p => p.id === selectedProducto)
    if (!producto) return

    const cantidadNum = parseInt(cantidad)
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      showAlert('Error', 'La cantidad debe ser un número válido mayor a 0')
      return
    }

    if (cantidadNum > producto.stock) {
      showAlert('Error', `Stock insuficiente. Disponible: ${producto.stock}`)
      return
    }

    const nuevoItem: ItemVenta = {
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: cantidadNum,
      precio_unitario: producto.precio,
      subtotal: cantidadNum * producto.precio
    }

    setItems([...items, nuevoItem])
    setSelectedProducto('')
    setCantidad('1')
  }

  const eliminarItem = (index: number) => {
    const nuevosItems = items.filter((_, i) => i !== index)
    setItems(nuevosItems)
  }

  const calcularTotal = () => {
    let total = items.reduce((total, item) => total + item.subtotal, 0)
    
    // Si es pago de reserva, agregar el precio de la reserva al total
    if (tipo === 'cancha_cumpleanos' && reservaId) {
      const reservaSeleccionada = reservas.find(r => r.id === reservaId)
      if (reservaSeleccionada) {
        total += reservaSeleccionada.precio
      }
    }
    
    return total
  }

  const handleGuardar = async () => {
    // Para ventas de cancha/cumpleaños, debe haber una reserva seleccionada
    if (tipo === 'cancha_cumpleanos') {
      if (!reservaId) {
        showAlert('Error', 'Selecciona una reserva')
        return
      }
    } else {
      // Para otros tipos de venta, debe haber al menos un producto
      if (items.length === 0) {
        showAlert('Error', 'Agrega al menos un producto')
        return
      }
    }

    // Validar que el pago esté completo
    const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0)
    const totalVenta = calcularTotal()
    
    if (Math.abs(totalPagado - totalVenta) > 0.01) {
      showAlert('Error', `El pago no está completo. Total: $${totalVenta.toFixed(2)}, Pagado: $${totalPagado.toFixed(2)}`)
      return
    }

    if (pagos.length === 0) {
      showAlert('Error', 'Debe agregar al menos un método de pago')
      return
    }

    if (!currentUser) {
      showAlert('Error', 'No se pudo obtener el usuario actual. Por favor, inicia sesión nuevamente.')
      return
    }

    setLoading(true)

    try {
      // Determinar el método de pago para la venta
      let metodoPagoVenta: 'efectivo' | 'mercadopago' | 'mixto'
      if (pagos.length === 1) {
        metodoPagoVenta = pagos[0].metodo
      } else {
        metodoPagoVenta = 'mixto'
      }

      // Crear la venta
      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas')
        .insert([{
          fecha: (() => {
            const now = new Date()
            const year = now.getFullYear()
            const month = String(now.getMonth() + 1).padStart(2, '0')
            const day = String(now.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          })(),
          total: calcularTotal(),
          metodo_pago: metodoPagoVenta,
          usuario_id: currentUser.id,
          tipo_venta: tipo as string,
          reserva_id: reservaId || null,
          observaciones: observaciones || null
        }])
        .select()

      if (ventaError) throw ventaError

      const ventaId = ventaData[0].id

      // Crear los registros de pagos
      const pagosVenta = pagos.map(pago => ({
        venta_id: ventaId,
        metodo_pago: pago.metodo,
        monto: pago.monto
      }))

      const { error: pagosError } = await supabase
        .from('pagos_venta')
        .insert(pagosVenta)

      if (pagosError) throw pagosError

      // Crear los items de venta
      const itemsVenta = items.map(item => ({
        venta_id: ventaId,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('items_venta')
        .insert(itemsVenta)

      if (itemsError) throw itemsError

      // Actualizar stock de productos
      for (const item of items) {
        const producto = productos.find(p => p.id === item.producto_id)
        if (producto) {
          await supabase
            .from('productos')
            .update({ stock: producto.stock - item.cantidad })
            .eq('id', item.producto_id)
        }
      }

      // Si es pago de reserva, marcar como pagada y completada
      if (tipo === 'cancha_cumpleanos' && reservaId) {
        await supabase
          .from('reservas')
          .update({ 
            pagada: true,
            estado: 'completada',
            venta_id: ventaId
          })
          .eq('id', reservaId)
      }

      showAlert('Éxito', 'Venta registrada correctamente', [
        {
          text: 'OK',
          onPress: () => {
            router.back() // Navegar automáticamente hacia atrás
          }
        }
      ])

    } catch (error: any) {
      showAlert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const getTipoTexto = () => {
    switch (tipo) {
      case 'cancha_cumpleanos': return 'Cancha/Cumpleaños'
      case 'bebidas': return 'Bebidas'
      case 'kiosco': return 'Kiosco'
      default: return 'Venta'
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text variant="headlineMedium" style={styles.title}>Nueva Venta</Text>
      <Text variant="titleMedium" style={styles.subtitle}>Tipo: {getTipoTexto()}</Text>
      
      {tipo === 'cancha_cumpleanos' && (
        <>
          <Text style={styles.label}>Reserva:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={reservaId}
              onValueChange={(itemValue) => setReservaId(itemValue)}
              enabled={!loading && !reservaBloqueada}
            >
              <Picker.Item label="Seleccionar reserva..." value="" />
              {reservas.map((reserva) => (
                <Picker.Item 
                  key={reserva.id} 
                  label={`${reserva.fecha} - ${reserva.canchas?.nombre} - ${reserva.responsable} - $${reserva.precio}`} 
                  value={reserva.id} 
                />
              ))}
            </Picker>
            {reservaBloqueada && (
              <Text style={styles.reservaBloqueadaText}>
                ✅ Reserva seleccionada desde el calendario
              </Text>
            )}
          </View>
          
          {reservaId && (
            <>
              <Text style={styles.label}>Reserva seleccionada:</Text>
              {(() => {
                const reservaSeleccionada = reservas.find(r => r.id === reservaId)
                return reservaSeleccionada ? (
                  <Card style={styles.itemCard}>
                    <Card.Content>
                      <View style={styles.itemInfo}>
                        <Text variant="titleSmall">Reserva de {reservaSeleccionada.canchas?.nombre}</Text>
                        <Text>Fecha: {reservaSeleccionada.fecha}</Text>
                        <Text>Hora: {reservaSeleccionada.hora_inicio} - {reservaSeleccionada.hora_fin}</Text>
                        <Text>Responsable: {reservaSeleccionada.responsable}</Text>
                        <Text>Tipo: {reservaSeleccionada.tipo === 'cancha' ? 'Cancha' : 'Cumpleaños'}</Text>
                        <Text variant="titleMedium">Precio: ${reservaSeleccionada.precio}</Text>
                      </View>
                    </Card.Content>
                  </Card>
                ) : null
              })()} 
            </>
          )}
        </>
      )}
      
      {(tipo === 'bebidas' || tipo === 'kiosco') && (
        <>
          <Text style={styles.label}>Agregar Producto:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProducto}
              onValueChange={(itemValue) => setSelectedProducto(itemValue)}
              enabled={!loading}
            >
              <Picker.Item label="Seleccionar producto..." value="" />
              {productos.map((producto) => (
                <Picker.Item 
                  key={producto.id} 
                  label={`${producto.nombre} - $${producto.precio} (Stock: ${producto.stock})`} 
                  value={producto.id} 
                />
              ))}
            </Picker>
          </View>
          
          <TextInput
            label="Cantidad"
            value={cantidad}
            onChangeText={setCantidad}
            style={styles.input}
            keyboardType="numeric"
            disabled={loading}
          />
          
          <Button
            mode="contained"
            onPress={agregarItem}
            style={styles.button}
            disabled={loading || !selectedProducto}
          >
            Agregar Producto
          </Button>
          
          {items.length > 0 && (
            <>
              <Text style={styles.label}>Productos agregados:</Text>
              {items.map((item, index) => (
                <Card key={index} style={styles.itemCard}>
                  <Card.Content>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text variant="titleSmall">{item.nombre}</Text>
                        <Text>Cantidad: {item.cantidad}</Text>
                        <Text>Precio: ${item.precio_unitario}</Text>
                        <Text variant="titleMedium">Subtotal: ${item.subtotal}</Text>
                      </View>
                      <IconButton
                        icon="delete"
                        onPress={() => eliminarItem(index)}
                        disabled={loading}
                      />
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}
        </>
      )}
      
      <PagosMultiples
        total={calcularTotal()}
        onPagosChange={setPagos}
        disabled={loading}
      />
      
      <TextInput
        label="Observaciones (opcional)"
        value={observaciones}
        onChangeText={setObservaciones}
        style={styles.input}
        multiline
        numberOfLines={3}
        disabled={loading}
      />
      
      <Text variant="headlineSmall" style={styles.total}>
        Total: ${calcularTotal().toFixed(2)}
      </Text>
      
      <Button
        mode="contained"
        onPress={handleGuardar}
        style={styles.button}
        disabled={loading || (tipo !== 'cancha_cumpleanos' && items.length === 0) || pagos.length === 0 || Math.abs(pagos.reduce((sum, pago) => sum + pago.monto, 0) - calcularTotal()) > 0.01}
      >
        {loading ? 'Guardando...' : 'Registrar Venta'}
      </Button>
      
      <Button
        mode="outlined"
        onPress={() => router.back()}
        style={styles.button}
      >
        Volver
      </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Espacio adicional para que el botón de volver sea visible
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 28,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#64748b',
    fontSize: 18,
    fontWeight: '500',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  button: {
    marginTop: 15,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 15,
    color: '#1e293b',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.8)',
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemCard: {
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  total: {
    textAlign: 'center',
    marginVertical: 25,
    fontWeight: '700',
    color: '#059669',
    fontSize: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reservaBloqueadaText: {
    fontSize: 14,
    color: '#6366f1',
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
  },
})