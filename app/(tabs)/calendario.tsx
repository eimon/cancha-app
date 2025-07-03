// app/(tabs)/calendario.tsx - Pantalla del calendario
import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native'
import { showAlert, showConfirm } from '../../lib/alerts'
import { Text, Button, Card, Chip, Portal, Modal, List } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { supabase, Reserva } from '../../lib/supabase'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialIcons } from '@expo/vector-icons'

export default function CalendarioScreen() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [fechaActual, setFechaActual] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    cargarReservas()
  }, [fechaActual])

  // Recargar datos cada vez que se cambie a esta pestaña
  useFocusEffect(
    React.useCallback(() => {
      cargarReservas()
    }, [fechaActual])
  )

  const cargarReservas = async () => {
    setLoading(true)
    const fechaStr = formatDate(fechaActual)
    
    const { data, error } = await supabase
      .from('reservas')
      .select(`
        *,
        canchas(nombre)
      `)
      .eq('fecha', fechaStr)
      .order('hora_inicio')
    
    // Obtener los nombres de todos los usuarios usando la función RPC
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(reserva => reserva.usuario_id))]
      
      // Llamar a la función RPC para obtener los display_names
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_user_display_names', { user_ids: userIds })
      
      if (usersError) {
        console.error('Error obteniendo nombres de usuario:', usersError)
      }
      
      // Crear un mapa de usuarios
      const usersMap = new Map()
      if (usersData) {
        usersData.forEach(user => {
          usersMap.set(user.user_id, {
            display_name: user.display_name
          })
        })
      }
      
      // Agregar información del usuario a cada reserva
      data.forEach(reserva => {
        reserva.users = usersMap.get(reserva.usuario_id) || { display_name: 'Usuario sin nombre' }
      })
    }

    if (error) {
      showAlert('Error', 'No se pudieron cargar las reservas')
    } else {
      setReservas(data || [])
    }
    setLoading(false)
  }

  const formatDate = (date: Date) => {
    // Formatear fecha respetando zona horaria local
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5)
  }

  const buscarFechaConReservas = async (direccion: 'anterior' | 'siguiente') => {
    try {
      const fechaInicio = new Date(fechaActual)
      const fechasBuscadas = []
      
      // Buscar hasta 30 días en la dirección especificada
      for (let i = 1; i <= 30; i++) {
        const fechaBusqueda = new Date(fechaInicio)
        if (direccion === 'anterior') {
          fechaBusqueda.setDate(fechaBusqueda.getDate() - i)
        } else {
          fechaBusqueda.setDate(fechaBusqueda.getDate() + i)
        }
        
        const fechaStr = formatDate(fechaBusqueda)
        fechasBuscadas.push(fechaStr)
      }
      
      // Buscar reservas en todas las fechas de una vez
      const { data, error } = await supabase
        .from('reservas')
        .select('fecha')
        .in('fecha', fechasBuscadas)
        .order('fecha', { ascending: direccion === 'siguiente' })
        .limit(1)
      
      if (error) {
        console.error('Error buscando fechas con reservas:', error)
        showAlert('Error', 'No se pudieron buscar las fechas con reservas')
        return
      }
      
      if (data && data.length > 0) {
        const nuevaFecha = new Date(data[0].fecha + 'T00:00:00')
        setFechaActual(nuevaFecha)
      } else {
        showAlert('Sin reservas', `No hay más reservas ${direccion === 'anterior' ? 'anteriores' : 'posteriores'} en los próximos 30 días`)
      }
    } catch (error) {
      console.error('Error en buscarFechaConReservas:', error)
      showAlert('Error', 'Ocurrió un error al buscar fechas con reservas')
    }
  }

  const cambiarDia = (direccion: 'anterior' | 'siguiente') => {
    buscarFechaConReservas(direccion)
  }

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setFechaActual(selectedDate)
    }
  }

  const mostrarSelectorFecha = () => {
    setShowDatePicker(true)
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return '#FFA726'
      case 'confirmada': return '#66BB6A'
      case 'cancelada': return '#EF5350'
      case 'completada': return '#42A5F5'
      default: return '#9E9E9E'
    }
  }

  const manejarClickReserva = (reserva: Reserva) => {
    if (reserva.estado === 'cancelada' || reserva.estado === 'completada') {
      return // No permitir acciones en reservas ya finalizadas
    }
    setReservaSeleccionada(reserva)
    setModalVisible(true)
  }

  const cancelarReserva = async () => {
    if (!reservaSeleccionada) return
    
    showConfirm(
      'Eliminar Reserva',
      '¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer.',
      async () => {
        try {
          console.log('Intentando eliminar reserva:', reservaSeleccionada.id)
          
          // Verificar si la reserva tiene pagos asociados
          const { data: ventas, error: ventasError } = await supabase
            .from('ventas')
            .select('id')
            .eq('reserva_id', reservaSeleccionada.id)

          if (ventasError) {
            console.error('Error al verificar ventas:', ventasError)
            throw ventasError
          }

          console.log('Ventas encontradas:', ventas)

          if (ventas && ventas.length > 0) {
            showAlert('Error', 'No se puede eliminar la reserva porque tiene pagos asociados')
            return
          }

          // Si no tiene pagos, eliminar la reserva
          console.log('Procediendo a eliminar reserva sin pagos')
          const { data, error, count } = await supabase
            .from('reservas')
            .delete()
            .eq('id', reservaSeleccionada.id)
            .select()

          console.log('Resultado de eliminación:', { data, error, count })

          if (error) {
            console.error('Error en eliminación:', error)
            throw error
          }

          if (!data || data.length === 0) {
            showAlert('Advertencia', 'No se encontró la reserva para eliminar o ya fue eliminada')
          } else {
            showAlert('Éxito', 'Reserva eliminada correctamente')
          }
          
          setModalVisible(false)
          cargarReservas()
        } catch (error) {
          console.error('Error completo:', error)
          showAlert('Error', `No se pudo eliminar la reserva: ${error.message || 'Error desconocido'}`)
        }
      }
    )
  }

  const finalizarReserva = () => {
    if (!reservaSeleccionada) return
    
    setModalVisible(false)
    // Navegar a nueva-venta con la reserva preseleccionada
    router.push({
      pathname: '/nueva-venta',
      params: { 
        tipo: 'cancha_cumpleanos',
        reservaId: reservaSeleccionada.id
      }
    })
  }

  const renderReserva = ({ item }: { item: Reserva }) => (
    <TouchableOpacity onPress={() => manejarClickReserva(item)}>
      <Card style={styles.reservaCard}>
        <Card.Content>
        <View style={styles.reservaHeader}>
          <Text variant="titleMedium" style={styles.horario}>
            {formatTime(item.hora_inicio)} - {formatTime(item.hora_fin)}
          </Text>
          <Chip 
            style={[styles.estadoChip, { backgroundColor: getEstadoColor(item.estado) }]}
            textStyle={{ color: 'white' }}
          >
            {item.estado}
          </Chip>
        </View>
        
        <View style={styles.reservaInfo}>
          <Text variant="bodyMedium" style={styles.cancha}>
            🏟️ {item.canchas?.nombre || 'Cancha no encontrada'}
          </Text>
          <Text variant="bodyMedium" style={styles.tipo}>
            📋 {item.tipo === 'cancha' ? 'Cancha' : 'Cumpleaños'}
          </Text>
          <Text variant="bodySmall" style={styles.usuario}>
            👤 Usuario: {item.users?.display_name || 'Usuario sin nombre'}
          </Text>
          <Text variant="bodySmall" style={styles.responsable}>
            👨‍💼 Responsable: {item.responsable}
          </Text>
          <Text variant="bodyMedium" style={styles.precio}>
            💰 ${item.precio}
          </Text>
          {item.pagada && (
            <Chip style={styles.pagadaChip} textStyle={{ color: 'white' }}>
              ✅ Pagada
            </Chip>
          )}
        </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Calendario de Reservas</Text>
      
      {/* Navegación de fechas */}
      <View style={styles.navegacionFecha}>
        <TouchableOpacity 
          onPress={() => cambiarDia('anterior')}
          style={styles.botonNavegacionCircular}
        >
          <MaterialIcons name="chevron-left" size={24} color="#3b82f6" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={mostrarSelectorFecha} style={styles.fechaContainer}>
          <Text variant="bodyMedium" style={styles.fechaDia}>
            {fechaActual.toLocaleDateString('es-ES', { weekday: 'long' })}
          </Text>
          <Text variant="titleMedium" style={styles.fechaCompleta}>
            {fechaActual.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => cambiarDia('siguiente')}
          style={styles.botonNavegacionCircular}
        >
          <MaterialIcons name="chevron-right" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Lista de reservas */}
      <View style={styles.reservasContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Cargando reservas...</Text>
        ) : reservas.length === 0 ? (
          <Text style={styles.noReservasText}>No hay reservas para este día</Text>
        ) : (
          <FlatList
            data={reservas}
            renderItem={renderReserva}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listaReservas}
          />
        )}
      </View>
      
      <Button
        mode="contained"
        onPress={() => router.push('/nueva-reserva')}
        style={styles.button}
      >
        Nueva Reserva
      </Button>

      {/* Modal de opciones para la reserva */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Opciones de Reserva
          </Text>
          
          {reservaSeleccionada && (
            <View style={styles.modalContent}>
              <Text variant="bodyMedium" style={styles.modalInfo}>
                {reservaSeleccionada.canchas?.nombre} - {formatTime(reservaSeleccionada.hora_inicio)} a {formatTime(reservaSeleccionada.hora_fin)}
              </Text>
              <Text variant="bodyMedium" style={styles.modalInfo}>
                Responsable: {reservaSeleccionada.responsable}
              </Text>
              <Text variant="bodyMedium" style={styles.modalInfo}>
                Precio: ${reservaSeleccionada.precio}
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="contained"
                  onPress={finalizarReserva}
                  style={[styles.modalButton, styles.finalizarButton]}
                  labelStyle={{ color: 'white' }}
                >
                  Finalizar y Cobrar
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={cancelarReserva}
                  style={[styles.modalButton, styles.cancelarButton]}
                  labelStyle={{ color: '#dc2626' }}
                >
                  Eliminar Reserva
                </Button>
                
                <Button
                  mode="text"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                >
                  Cerrar
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>

      {/* DatePicker para seleccionar fecha */}
      {showDatePicker && (
        <DateTimePicker
          value={fechaActual}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(248, 250, 252, 0.95)', // Fondo glass claro
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#1e293b', // Título más oscuro para mejor contraste
    fontWeight: '700',
    fontSize: 28,
  },
  navegacionFecha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  botonNavegacionCircular: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fechaContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  fechaDia: {
    textAlign: 'center',
    textTransform: 'capitalize',
    color: '#64748b',
    fontWeight: '500',
    fontSize: 14,
  },
  fechaCompleta: {
    textAlign: 'center',
    textTransform: 'capitalize',
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 16,
  },
  reservasContainer: {
    flex: 1,
    marginBottom: 20,
  },
  listaReservas: {
    paddingBottom: 10,
  },
  reservaCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  reservaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  horario: {
    fontWeight: '700',
    color: '#1e40af', // Azul más oscuro para mejor contraste
    fontSize: 18,
  },
  estadoChip: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  reservaInfo: {
    gap: 6,
  },
  cancha: {
    fontWeight: '700',
    color: '#0f172a', // Negro más suave para mejor legibilidad
    fontSize: 16,
  },
  tipo: {
    color: '#475569', // Gris más oscuro
    fontWeight: '500',
    fontSize: 15,
  },
  usuario: {
    color: '#334155', // Gris oscuro para mejor contraste
    fontWeight: '500',
    fontSize: 14,
  },
  responsable: {
    color: '#334155', // Gris oscuro para mejor contraste
    fontWeight: '500',
    fontSize: 14,
  },
  precio: {
    fontWeight: '700',
    color: '#059669', // Verde más oscuro
    marginTop: 8,
    fontSize: 17,
  },
  pagadaChip: {
    backgroundColor: '#10b981',
    alignSelf: 'flex-start',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#475569', // Gris más oscuro
    fontSize: 16,
    fontWeight: '500',
  },
  noReservasText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#475569', // Gris más oscuro
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    marginTop: 15,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#1e293b',
    fontWeight: '700',
  },
  modalContent: {
    gap: 12,
  },
  modalInfo: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    borderRadius: 12,
  },
  finalizarButton: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelarButton: {
    borderColor: '#dc2626',
    borderWidth: 1.5,
  },
})