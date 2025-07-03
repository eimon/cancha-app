import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { showAlert } from '../lib/alerts';

export default function NuevaCanchaScreen() {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioHora, setPrecioHora] = useState('');

  const handleGuardar = async () => {
    if (!nombre || !precioHora) {
      showAlert('Error', 'Nombre y precio por hora son requeridos.');
      return;
    }

    const { data, error } = await supabase
      .from('canchas')
      .insert([{ 
        nombre,
        descripcion,
        precio_hora: parseFloat(precioHora),
        activa: true
      }]);

    if (error) {
      showAlert('Error', error.message);
    } else {
      showAlert('Éxito', 'Cancha guardada correctamente.');
      setNombre('');
      setDescripcion('');
      setPrecioHora('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <Text style={styles.title}>Nueva Cancha</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre de la cancha"
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        style={styles.input}
        placeholder="Descripción (opcional)"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Precio por hora"
        value={precioHora}
        onChangeText={setPrecioHora}
        keyboardType="numeric"
      />
      <Button title="Guardar Cancha" onPress={handleGuardar} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
});