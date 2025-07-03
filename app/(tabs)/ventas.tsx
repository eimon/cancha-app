// app/(tabs)/ventas.tsx - Pantalla de ventas
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View, Share, TouchableOpacity } from 'react-native'
import { showAlert, showConfirm } from '../../lib/alerts'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card, DataTable, Text, ActivityIndicator, Portal, Dialog, TextInput, IconButton } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '../../lib/supabase'

interface VentaDetalle {
  id: string
  fecha: string
  tipo_venta: 'cancha_cumpleanos' | 'bebidas' | 'kiosco'
  total: number
  metodo_pago: 'efectivo' | 'mercadopago' | 'mixto'
  pagos?: {
    metodo_pago: 'efectivo' | 'mercadopago'
    monto: number
  }[]
  detalles?: any // Para almacenar los detalles de la venta
}

export default function VentasScreen() {
  const [ventas, setVentas] = useState<VentaDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    cargarVentas()
  }, [])

  const cargarVentas = async () => {
    setLoading(true)
    try {
      // Cargar ventas con sus pagos asociados
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas')
        .select('*')
        .order('created_at', { ascending: false })

      if (ventasError) throw ventasError

      // Para cada venta, cargar sus pagos y detalles
      const ventasConDetalles = await Promise.all(
        ventasData.map(async (venta) => {
          let ventaCompleta = { ...venta }

          // Cargar pagos si es de tipo mixto
          if (venta.metodo_pago === 'mixto') {
            const { data: pagosData, error: pagosError } = await supabase
              .from('pagos_venta')
              .select('*')
              .eq('venta_id', venta.id)

            if (pagosError) {
              ventaCompleta.pagos = []
            } else {
              ventaCompleta.pagos = pagosData
            }
          }

          // Cargar detalles según el tipo de venta
          if (venta.tipo_venta === 'cancha_cumpleanos') {
            // Cargar información de la reserva
            const { data: reservaData, error: reservaError } = await supabase
              .from('reservas')
              .select(`
                *,
                canchas(nombre)
              `)
              .eq('id', venta.reserva_id)
              .single()

            if (!reservaError && reservaData) {
              ventaCompleta.detalles = {
                tipo: 'reserva',
                reserva: reservaData
              }
            }
          } else {
            // Cargar productos de la venta
            const { data: productosData, error: productosError } = await supabase
              .from('items_venta')
              .select(`
                cantidad,
                precio_unitario,
                subtotal,
                productos(nombre)
              `)
              .eq('venta_id', venta.id)

            if (!productosError && productosData && productosData.length > 0) {
              ventaCompleta.detalles = {
                tipo: 'productos',
                productos: productosData
              }
            }
          }

          return ventaCompleta
        })
      )

      setVentas(ventasConDetalles)
    } catch (error: any) {
      showAlert('Error', 'No se pudieron cargar las ventas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const confirmarEliminacionPago = (ventaId: string, pago: any, pagoIndex: number) => {
    const metodoTexto = pago.metodo_pago === 'efectivo' ? 'Efectivo' : 'MercadoPago'
    const mensaje = `¿Estás seguro de que deseas eliminar este pago de ${metodoTexto} por $${pago.monto.toFixed(2)}?\n\nEsto actualizará el estado de la reserva asociada.`
    
    showConfirm(
      'Confirmar Eliminación de Pago',
      mensaje,
      () => eliminarPago(ventaId, pago.id, pagoIndex)
    )
  }

  const eliminarPago = async (ventaId: string, pagoId: string, pagoIndex: number) => {
    try {
      setLoading(true)

      // Eliminar el pago de la base de datos
      const { error: pagoError } = await supabase
        .from('pagos_venta')
        .delete()
        .eq('id', pagoId)

      if (pagoError) {
        throw pagoError
      }

      // Obtener la venta para verificar si tiene reserva asociada
      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas')
        .select('reserva_id, metodo_pago')
        .eq('id', ventaId)
        .single()

      if (ventaError) {
        throw ventaError
      }

      // Si la venta tiene una reserva asociada, verificar el estado de los pagos
      if (ventaData.reserva_id) {
        // Obtener todos los pagos restantes de la venta
        const { data: pagosRestantes, error: pagosError } = await supabase
          .from('pagos_venta')
          .select('monto')
          .eq('venta_id', ventaId)

        if (pagosError) {
          throw pagosError
        }

        // Calcular el total pagado restante
        const totalPagado = pagosRestantes?.reduce((sum, pago) => sum + pago.monto, 0) || 0

        // Obtener el total de la venta
        const { data: ventaCompleta, error: ventaCompletaError } = await supabase
          .from('ventas')
          .select('total')
          .eq('id', ventaId)
          .single()

        if (ventaCompletaError) {
          throw ventaCompletaError
        }

        // Determinar si la reserva debe marcarse como pagada o no
        const estaPagadaCompleta = Math.abs(totalPagado - ventaCompleta.total) < 0.01

        // Actualizar el estado de la reserva
        const { data: updateResult, error: reservaError } = await supabase
          .from('reservas')
          .update({ pagada: estaPagadaCompleta })
          .eq('id', ventaData.reserva_id)
          .select()

        // LOG ESPECÍFICO: Ver qué devuelve la actualización del campo 'pagada' a FALSE
        console.log('RESULTADO ACTUALIZACIÓN PAGADA:', {
          intentandoCambiarA: estaPagadaCompleta,
          resultado: updateResult,
          error: reservaError
        })

        if (reservaError) {
          // Intentar método alternativo usando RPC para evitar políticas RLS
          try {
            const { data: rpcResult, error: rpcError } = await supabase
              .rpc('update_reserva_pagada', {
                reserva_id: ventaData.reserva_id,
                nueva_pagada: estaPagadaCompleta
              })
            
            if (rpcError) {
              throw rpcError
            }
          } catch (rpcError) {
            showAlert('Advertencia', 'El pago se eliminó pero no se pudo actualizar el estado de la reserva. Verifica manualmente en la base de datos.')
            // No lanzar error para que el resto del proceso continúe
          }
        }
      }

      // Recargar las ventas para reflejar los cambios
      await cargarVentas()
      showAlert('Éxito', 'Pago eliminado y estado de reserva actualizado correctamente')

    } catch (error) {
      showAlert('Error', 'No se pudo eliminar el pago')
    } finally {
      setLoading(false)
    }
  }

  const getTipoTexto = (tipo: string) => {
    switch (tipo) {
      case 'cancha_cumpleanos': return 'Reservas'
      case 'bebidas': return 'Bebidas'
      case 'kiosco': return 'Kiosco'
      default: return tipo
    }
  }

  const formatearFecha = (fecha: string) => {
    // Crear fecha sin problemas de zona horaria
    const fechaObj = new Date(fecha + 'T00:00:00')
    return fechaObj.toLocaleDateString('es-ES')
  }

  const getPagosTexto = (venta: VentaDetalle) => {
    if (venta.metodo_pago === 'mixto' && venta.pagos) {
      return venta.pagos
        .map(pago => `${pago.metodo_pago === 'efectivo' ? 'Efectivo' : 'MercadoPago'}: $${pago.monto.toFixed(2)}`)
        .join(', ')
    } else {
      const metodo = venta.metodo_pago === 'efectivo' ? 'Efectivo' : 'MercadoPago'
      return `${metodo}: $${venta.total.toFixed(2)}`
    }
  }

  const mostrarSelectorFecha = () => {
    setShowDatePicker(true)
  }

  const exportarCSVPorFecha = async (fecha: Date) => {
    try {
      setLoading(true)
      
      // Formatear fecha para la consulta (YYYY-MM-DD) respetando zona horaria local
      const year = fecha.getFullYear()
      const month = String(fecha.getMonth() + 1).padStart(2, '0')
      const day = String(fecha.getDate()).padStart(2, '0')
      const fechaConsulta = `${year}-${month}-${day}`
      
      // Cargar ventas del día específico
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas')
        .select('*')
        .gte('created_at', `${fechaConsulta}T00:00:00.000Z`)
        .lt('created_at', `${fechaConsulta}T23:59:59.999Z`)
        .order('created_at', { ascending: false })

      if (ventasError) throw ventasError

      if (ventasData.length === 0) {
        showAlert('Sin datos', `No hay ventas registradas para el ${formatearFecha(fechaConsulta)}`)
        return
      }

      // Para cada venta, cargar sus pagos y detalles
      const ventasConDetalles = await Promise.all(
        ventasData.map(async (venta) => {
          let ventaCompleta = { ...venta }

          // Cargar pagos si es de tipo mixto
          if (venta.metodo_pago === 'mixto') {
            const { data: pagosData, error: pagosError } = await supabase
              .from('pagos_venta')
              .select('metodo_pago, monto')
              .eq('venta_id', venta.id)

            if (pagosError) {
              console.error('Error cargando pagos:', pagosError)
              ventaCompleta.pagos = []
            } else {
              ventaCompleta.pagos = pagosData
            }
          }

          // Cargar detalles según el tipo de venta
          if (venta.tipo_venta === 'cancha_cumpleanos') {
            const { data: reservaData, error: reservaError } = await supabase
              .from('reservas')
              .select('*, canchas(nombre)')
              .eq('id', venta.reserva_id)
              .single()

            if (!reservaError && reservaData) {
              ventaCompleta.detalles = {
                tipo: 'reserva',
                reserva: reservaData
              }
            }
          } else {
            // Cargar productos de la venta
            const { data: productosData, error: productosError } = await supabase
              .from('items_venta')
              .select(`
                cantidad,
                precio_unitario,
                subtotal,
                productos(nombre)
              `)
              .eq('venta_id', venta.id)

            if (!productosError && productosData && productosData.length > 0) {
              ventaCompleta.detalles = {
                tipo: 'productos',
                productos: productosData
              }
            }
          }

          return ventaCompleta
        })
      )

      // Crear el contenido CSV con detalles
      let csvContent = 'Fecha,Tipo,Pagos,Total,Producto,Cantidad,Precio Unitario,Subtotal,Cancha,Responsable\n'
      
      ventasConDetalles.forEach(venta => {
        const fecha = formatearFecha(venta.fecha)
        const tipo = getTipoTexto(venta.tipo_venta)
        const pagos = getPagosTexto(venta).replace(/,/g, ';') // Reemplazar comas para evitar conflictos
        const total = venta.total.toFixed(2)
        
        if (venta.detalles) {
          if (venta.detalles.tipo === 'reserva') {
            // Para reservas, agregar una línea con los datos de la reserva
            const reserva = venta.detalles.reserva
            const cancha = reserva.canchas?.nombre || 'N/A'
            const responsable = reserva.responsable || 'N/A'
            csvContent += `"${fecha}","${tipo}","${pagos}","${total}","Reserva","1","${total}","${total}","${cancha}","${responsable}"\n`
          } else if (venta.detalles.tipo === 'productos') {
            // Para productos, agregar una línea por cada producto
            venta.detalles.productos.forEach((producto: any) => {
              const nombreProducto = producto.productos?.nombre || 'Producto'
              const cantidad = producto.cantidad
              const precioUnitario = producto.precio_unitario.toFixed(2)
              const subtotal = (producto.cantidad * producto.precio_unitario).toFixed(2)
              csvContent += `"${fecha}","${tipo}","${pagos}","${total}","${nombreProducto}","${cantidad}","${precioUnitario}","${subtotal}","",""\n`
            })
          }
        } else {
          // Si no hay detalles, agregar línea básica
          csvContent += `"${fecha}","${tipo}","${pagos}","${total}","Sin detalles","","","","",""\n`
        }
      })

      // Compartir el archivo CSV
      await Share.share({
        message: csvContent,
        title: `Reporte Detallado de Ventas - ${formatearFecha(fechaConsulta)}`,
      })
    } catch (error: any) {
      showAlert('Error', 'No se pudo exportar el archivo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false)
    if (date) {
      setSelectedDate(date)
      exportarCSVPorFecha(date)
    }
  }

  const toggleRowExpansion = (ventaId: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(ventaId)) {
      newExpandedRows.delete(ventaId)
    } else {
      newExpandedRows.add(ventaId)
    }
    setExpandedRows(newExpandedRows)
  }

  const confirmarEliminacion = (venta: VentaDetalle) => {
    const tipoTexto = getTipoTexto(venta.tipo_venta)
    let mensaje = `¿Estás seguro de que deseas eliminar esta venta de ${tipoTexto}?`
    
    if (venta.tipo_venta === 'cancha_cumpleanos') {
      mensaje += '\n\nLa reserva asociada quedará sin venta vinculada.'
    }
    
    mensaje += '\n\nLos productos serán devueltos al stock.'
    
    showConfirm(
      'Confirmar Eliminación',
      mensaje,
      () => eliminarVenta(venta)
    )
  }

  const eliminarVenta = async (venta: VentaDetalle) => {
    try {
      console.log('🗑️ Iniciando eliminación de venta:', venta.id)
      setLoading(true)

      // Restaurar stock de productos ANTES de eliminar (si es venta de productos)
      if (venta.tipo_venta === 'bebidas' || venta.tipo_venta === 'kiosco') {
        console.log('📦 Restaurando stock para venta de productos...')
        // Cargar items_venta con producto_id para restaurar stock
        const { data: itemsData, error: itemsError } = await supabase
          .from('items_venta')
          .select('producto_id, cantidad')
          .eq('venta_id', venta.id)

        console.log('📋 Items encontrados:', itemsData?.length || 0)

        if (!itemsError && itemsData) {
          for (const item of itemsData) {
            console.log(`📦 Restaurando stock para producto ${item.producto_id}: +${item.cantidad}`)
            // Obtener el stock actual del producto
            const { data: productoData, error: productoError } = await supabase
              .from('productos')
              .select('stock')
              .eq('id', item.producto_id)
              .single()

            if (!productoError && productoData) {
              const nuevoStock = productoData.stock + item.cantidad
              console.log(`📦 Stock actual: ${productoData.stock}, nuevo stock: ${nuevoStock}`)
              const { error: stockError } = await supabase
                .from('productos')
                .update({ stock: nuevoStock })
                .eq('id', item.producto_id)

              if (stockError) {
                console.error('❌ Error restaurando stock:', stockError)
              } else {
                console.log('✅ Stock restaurado correctamente')
              }
            }
          }
        }
      }

      console.log('🗑️ Eliminando venta principal con ID:', venta.id)
      // Eliminar la venta principal - la base de datos se encarga de eliminar las relaciones automáticamente
      const { error: ventaError, data: deleteResult } = await supabase
        .from('ventas')
        .delete()
        .eq('id', venta.id)

      console.log('🗑️ Resultado de eliminación:', { error: ventaError, data: deleteResult })

      if (ventaError) {
        console.error('❌ Error al eliminar la venta:', ventaError)
        throw new Error('Error al eliminar la venta: ' + ventaError.message)
      }

      console.log('✅ Venta eliminada exitosamente')
      showAlert('Éxito', 'Venta eliminada correctamente. Los productos han sido devueltos al stock.')
      
      // Recargar las ventas
      console.log('🔄 Recargando lista de ventas...')
      await cargarVentas()
      
    } catch (error: any) {
      console.error('❌ Error en eliminarVenta:', error)
      showAlert('Error', error.message || 'No se pudo eliminar la venta')
    } finally {
      setLoading(false)
    }
  }

  const renderDetallesExpandidos = (venta: VentaDetalle) => {
    if (!venta.detalles) {
      return (
        <View style={styles.expandedContent}>
          <Text style={styles.noDetailsText}>No hay detalles disponibles</Text>
        </View>
      )
    }

    if (venta.detalles.tipo === 'reserva') {
      const reserva = venta.detalles.reserva
      return (
        <View style={styles.expandedContent}>
          <Text style={styles.detailsTitle}>📅 Detalles de la Reserva</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cancha:</Text>
            <Text style={styles.detailValue}>{reserva.canchas?.nombre || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha:</Text>
            <Text style={styles.detailValue}>{formatearFecha(reserva.fecha)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Horario:</Text>
            <Text style={styles.detailValue}>{reserva.hora_inicio} - {reserva.hora_fin}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tipo:</Text>
            <Text style={styles.detailValue}>{reserva.tipo === 'cancha' ? 'Cancha' : 'Cumpleaños'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Responsable:</Text>
            <Text style={styles.detailValue}>{reserva.responsable}</Text>
          </View>
          {reserva.observaciones && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Observaciones:</Text>
              <Text style={styles.detailValue}>{reserva.observaciones}</Text>
            </View>
          )}
          {venta.metodo_pago === 'mixto' && venta.pagos && (
            <View style={styles.pagosSection}>
              <Text style={styles.detailsTitle}>💳 Gestión de Pagos</Text>
              {venta.pagos.map((pago, index) => (
                <View key={index} style={styles.pagoRow}>
                  <View style={styles.pagoInfo}>
                    <Text style={styles.pagoMetodo}>
                      {pago.metodo_pago === 'efectivo' ? '💵 Efectivo' : '💳 MercadoPago'}
                    </Text>
                    <Text style={styles.pagoMonto}>${pago.monto.toFixed(2)}</Text>
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor="#dc2626"
                    onPress={() => confirmarEliminacionPago(venta.id, pago, index)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )
    } else if (venta.detalles.tipo === 'productos' || venta.tipo_venta === 'bebidas' || venta.tipo_venta === 'kiosco') {
      const productos = venta.detalles.productos
      const tipoIcono = venta.tipo_venta === 'bebidas' ? '🥤' : venta.tipo_venta === 'kiosco' ? '🍿' : '🛒'
      const tipoTitulo = venta.tipo_venta === 'bebidas' ? 'Bebidas Vendidas' : venta.tipo_venta === 'kiosco' ? 'Productos de Kiosco' : 'Productos Vendidos'
      
      return (
        <View style={styles.expandedContent}>
          <Text style={styles.detailsTitle}>{tipoIcono} {tipoTitulo}</Text>
          {productos.map((producto: any, index: number) => (
            <View key={index} style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{producto.productos?.nombre || 'Producto'}</Text>
                <Text style={styles.productDetails}>
                  Cantidad: {producto.cantidad} × ${producto.precio_unitario.toFixed(2)} = ${(producto.cantidad * producto.precio_unitario).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )
    }

    return null
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.title}>Reporte de Ventas</Text>
        
        <Button
          mode="contained"
          onPress={mostrarSelectorFecha}
          style={styles.exportButton}
          icon="download"
          disabled={loading}
        >
          Exportar a CSV por Fecha
        </Button>

        {ventas.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No hay ventas registradas</Text>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.tableCard}>
            <Card.Content>
              <DataTable>
                <DataTable.Header style={styles.tableHeader}>
                  <DataTable.Title style={[styles.dateColumn, styles.headerText]}>Fecha</DataTable.Title>
                  <DataTable.Title style={[styles.typeColumn, styles.headerText]}>Tipo</DataTable.Title>
                  <DataTable.Title style={[styles.paymentColumn, styles.headerText]}>Pagos</DataTable.Title>
                  <DataTable.Title style={[styles.totalColumn, styles.headerText]} numeric>Total</DataTable.Title>
                  <DataTable.Title style={styles.actionsColumn}></DataTable.Title>
                </DataTable.Header>

                {ventas.map((venta) => (
                  <React.Fragment key={venta.id}>
                    <TouchableOpacity onPress={() => toggleRowExpansion(venta.id)}>
                      <DataTable.Row>
                        <DataTable.Cell style={styles.dateColumn}>
                          <Text style={styles.cellText}>{formatearFecha(venta.fecha)}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.typeColumn}>
                          <Text style={styles.cellText}>{getTipoTexto(venta.tipo_venta)}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.paymentColumn}>
                          <Text style={styles.cellTextSmall}>{getPagosTexto(venta)}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.totalColumn} numeric>
                          <Text style={styles.totalText}>${venta.total.toFixed(2)}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.actionsColumn}>
                          <IconButton
                            icon="delete"
                            size={20}
                            iconColor="#dc2626"
                            onPress={() => confirmarEliminacion(venta)}
                          />
                        </DataTable.Cell>
                      </DataTable.Row>
                    </TouchableOpacity>
                    {expandedRows.has(venta.id) && (
                      <View style={styles.expandedRow}>
                        {renderDetallesExpandidos(venta)}
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </DataTable>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="outlined"
          onPress={cargarVentas}
          style={styles.refreshButton}
          icon="refresh"
        >
          Actualizar
        </Button>
      </ScrollView>
      
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 28,
  },
  exportButton: {
    marginBottom: 20,
    backgroundColor: '#059669',
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButton: {
    marginTop: 20,
    borderColor: '#2563eb',
    borderRadius: 12,
  },
  tableCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
  },
  dateColumn: {
    flex: 1.5,
  },
  typeColumn: {
    flex: 1.2,
  },
  paymentColumn: {
    flex: 2.5,
  },
  totalColumn: {
    flex: 1.2,
  },
  actionsColumn: {
    flex: 0.8,
  },
  tableHeader: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  headerText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  cellText: {
    fontSize: 14,
    color: '#1e293b',
  },
  cellTextSmall: {
    fontSize: 12,
    color: '#1e293b',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  cellWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedRow: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  pagosSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  pagoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pagoInfo: {
    flex: 1,
  },
  pagoMetodo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  pagoMonto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  expandedContent: {
    padding: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  productRow: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  noDetailsText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
})