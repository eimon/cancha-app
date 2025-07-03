// app/nueva-reserva.tsx - Pantalla nueva reserva
import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { showAlert } from '../lib/alerts'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Button, TextInput } from 'react-native-paper'
import { Picker } from '@react-native-picker/picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import { supabase, Cancha } from '../lib/supabase'

export default function NuevaReservaScreen() {
  const [fecha, setFecha] = useState(new Date())
  const [horaInicio, setHoraInicio] = useState(new Date())
  const [horaFin, setHoraFin] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePickerInicio, setShowTimePickerInicio] = useState(false)
  const [showTimePickerFin, setShowTimePickerFin] = useState(false)
  const [canchaId, setCanchaId] = useState('')
  const [responsable, setResponsable] = useState('')
  const [tipo, setTipo] = useState<'cancha' | 'cumpleanos'>('cancha')
  const [precio, setPrecio] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [canchas, setCanchas] = useState<Cancha[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    cargarCanchas()
    obtenerUsuarioActual()
  }, [])

  const obtenerUsuarioActual = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const cargarCanchas = async () => {
    const { data, error } = await supabase
      .from('canchas')
      .select('*')
      .eq('activa', true)
      .order('nombre')

    if (error) {
      showAlert('Error', 'No se pudieron cargar las canchas')
    } else {
      setCanchas(data || [])
    }
  }

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setFecha(selectedDate)
    }
  }

  const onTimeChangeInicio = (event: any, selectedTime?: Date) => {
    setShowTimePickerInicio(false)
    if (selectedTime) {
      // Establecer minutos en 00
      const timeWithZeroMinutes = new Date(selectedTime)
      timeWithZeroMinutes.setMinutes(0)
      timeWithZeroMinutes.setSeconds(0)
      timeWithZeroMinutes.setMilliseconds(0)
      setHoraInicio(timeWithZeroMinutes)
    }
  }

  const onTimeChangeFin = (event: any, selectedTime?: Date) => {
    setShowTimePickerFin(false)
    if (selectedTime) {
      // Establecer minutos en 00
      const timeWithZeroMinutes = new Date(selectedTime)
      timeWithZeroMinutes.setMinutes(0)
      timeWithZeroMinutes.setSeconds(0)
      timeWithZeroMinutes.setMilliseconds(0)
      setHoraFin(timeWithZeroMinutes)
    }
  }

  const formatDate = (date: Date) => {
    // Formatear fecha respetando zona horaria local
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    return `${hours}:00`
  }

  const handleGuardar = async () => {
    if (!fecha || !horaInicio || !horaFin || !canchaId || !precio || !responsable) {
      showAlert('Error', 'Todos los campos marcados son requeridos.')
      return
    }

    if (responsable.length > 50) {
      showAlert('Error', 'El nombre del responsable no puede exceder 50 caracteres.')
      return
    }

    if (isNaN(parseFloat(precio)) || parseFloat(precio) <= 0) {
      showAlert('Error', 'El precio debe ser un número válido mayor a 0.')
      return
    }

    // Validar que la hora de fin sea posterior a la de inicio
    if (horaFin <= horaInicio) {
      showAlert('Error', 'La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

    if (!currentUser) {
      showAlert('Error', 'No se pudo obtener el usuario actual. Por favor, inicia sesión nuevamente.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('reservas')
        .insert([{
          fecha: formatDate(fecha),
          hora_inicio: formatTime(horaInicio),
          hora_fin: formatTime(horaFin),
          cancha_id: canchaId,
          usuario_id: currentUser.id,
          responsable: responsable,
          estado: 'pendiente',
          tipo,
          precio: parseFloat(precio),
          pagada: false,
          observaciones: observaciones || null
        }])

      if (error) {
        // Interceptar error de constraint único para horario duplicado
        if (error.message.includes('duplicate key value violates unique constraint') && 
            error.message.includes('reservas_cancha_id_fecha_hora_inicio_key')) {
          const canchaSeleccionada = canchas.find(c => c.id === canchaId)
          showAlert(
            'Horario no disponible', 
            `Ya existe una reserva para la cancha "${canchaSeleccionada?.nombre || 'seleccionada'}" el ${formatDate(fecha)} a las ${formatTime(horaInicio)}. Por favor, selecciona otro horario.`
          )
        } else {
          showAlert('Error', error.message)
        }
      } else {
        showAlert('Éxito', 'Reserva guardada correctamente.', [
          {
            text: 'OK',
            onPress: () => {
              router.push('/(tabs)/calendario')
            }
          }
        ])
      }
    } catch (error) {
      showAlert('Error', 'Ocurrió un error inesperado. Por favor, intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Nueva Reserva</Text>
      
      <Text style={styles.label}>Fecha *:</Text>
      <Button
        mode="outlined"
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
        disabled={loading}
      >
        {formatDate(fecha)}
      </Button>
      {showDatePicker && (
        <DateTimePicker
          value={fecha}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      
      <Text style={styles.label}>Hora Inicio *:</Text>
      <Button
        mode="outlined"
        onPress={() => setShowTimePickerInicio(true)}
        style={styles.dateButton}
        disabled={loading}
      >
        {formatTime(horaInicio)}
      </Button>
      {showTimePickerInicio && (
        <DateTimePicker
          value={horaInicio}
          mode="time"
          display="default"
          onChange={onTimeChangeInicio}
          minuteInterval={60}
        />
      )}
      
      <Text style={styles.label}>Hora Fin *:</Text>
      <Button
        mode="outlined"
        onPress={() => setShowTimePickerFin(true)}
        style={styles.dateButton}
        disabled={loading}
      >
        {formatTime(horaFin)}
      </Button>
      {showTimePickerFin && (
        <DateTimePicker
          value={horaFin}
          mode="time"
          display="default"
          onChange={onTimeChangeFin}
          minuteInterval={60}
        />
      )}
      
      <Text style={styles.label}>Cancha *:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={canchaId}
          onValueChange={(itemValue) => {
            setCanchaId(itemValue)
            // Establecer precio por defecto basado en la cancha seleccionada
            if (itemValue) {
              const canchaSeleccionada = canchas.find(c => c.id === itemValue)
              if (canchaSeleccionada) {
                setPrecio(canchaSeleccionada.precio_hora.toString())
              }
            } else {
              setPrecio('')
            }
          }}
          enabled={!loading}
        >
          <Picker.Item label="Seleccionar cancha..." value="" />
          {canchas.map((cancha) => (
            <Picker.Item 
              key={cancha.id} 
              label={`${cancha.nombre} - $${cancha.precio_hora}/hora`} 
              value={cancha.id} 
            />
          ))}
        </Picker>
      </View>
      
      <Text style={styles.label}>Tipo *:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={tipo}
          onValueChange={(itemValue) => setTipo(itemValue)}
          enabled={!loading}
        >
          <Picker.Item label="Cancha" value="cancha" />
          <Picker.Item label="Cumpleaños" value="cumpleanos" />
        </Picker>
      </View>
      
      <TextInput
        label="Precio *"
        value={precio}
        onChangeText={setPrecio}
        style={styles.input}
        keyboardType="numeric"
        disabled={loading}
      />
      
      <TextInput
        label="Responsable *"
        value={responsable}
        onChangeText={setResponsable}
        maxLength={50}
        style={styles.input}
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
      
      <Button
        mode="contained"
        onPress={handleGuardar}
        style={styles.button}
        disabled={loading}
      >
        {loading ? 'Guardando...' : 'Guardar Reserva'}
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  dateButton: {
    marginBottom: 15,
    justifyContent: 'flex-start',
  },
})