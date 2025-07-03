import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { showAlert } from '../lib/alerts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

export default function NuevoProductoScreen() {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [categoria, setCategoria] = useState<'bebidas' | 'kiosco'>('bebidas');
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    if (!nombre || !precio || !stock) {
      showAlert('Error', 'Todos los campos son requeridos.');
      return;
    }

    if (isNaN(parseFloat(precio)) || parseFloat(precio) <= 0) {
      showAlert('Error', 'El precio debe ser un número válido mayor a 0.');
      return;
    }

    if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
      showAlert('Error', 'El stock debe ser un número válido mayor o igual a 0.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('productos')
      .insert([{ 
        nombre: nombre.trim(),
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria,
        activo: true
      }]);

    setLoading(false);

    if (error) {
      showAlert('Error', error.message);
    } else {
      showAlert('Éxito', 'Producto guardado correctamente.', [
        {
          text: 'OK',
          onPress: () => {
            setNombre('');
            setPrecio('');
            setStock('');
            setCategoria('bebidas');
          }
        }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <Text style={styles.title}>Nuevo Producto</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Nombre del producto"
        value={nombre}
        onChangeText={setNombre}
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Precio"
        value={precio}
        onChangeText={setPrecio}
        keyboardType="numeric"
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Stock inicial"
        value={stock}
        onChangeText={setStock}
        keyboardType="numeric"
        editable={!loading}
      />
      
      <Text style={styles.label}>Categoría:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={categoria}
          onValueChange={(itemValue) => setCategoria(itemValue)}
          enabled={!loading}
          style={styles.picker}
        >
          <Picker.Item label="Bebidas" value="bebidas" />
          <Picker.Item label="Kiosco" value="kiosco" />
        </Picker>
      </View>
      
      <Button 
        title={loading ? "Guardando..." : "Guardar Producto"} 
        onPress={handleGuardar} 
        disabled={loading}
      />
      
      <Button 
        title="Volver" 
        onPress={() => router.back()} 
        color="#666"
      />
      </ScrollView>
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
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
  },
  picker: {
    height: 50,
  },
});