// app/(tabs)/caja.tsx - Pantalla de caja
import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { router } from 'expo-router'

export default function CajaScreen() {


  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="headlineMedium" style={styles.title}>Caja</Text>
        
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>🏟️ Cancha/Cumpleaños</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/nueva-venta?tipo=cancha_cumpleanos')}
              style={styles.button}
            >
              Registrar Pago
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>🥤 Bebidas</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/nueva-venta?tipo=bebidas')}
              style={styles.button}
            >
              Vender Bebidas
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>🍿 Kiosco</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/nueva-venta?tipo=kiosco')}
              style={styles.button}
            >
              Vender Kiosco
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>⚙️ Gestión</Text>
            <Button
              mode="outlined"
              onPress={() => router.push('/nuevo-producto')}
              style={styles.outlinedButton}
            >
              Agregar Producto
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.push('/nueva-cancha')}
              style={styles.outlinedButton}
            >
              Agregar Cancha
            </Button>
          </Card.Content>
        </Card>


      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.95)', // Fondo glass claro
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Espacio extra al final
  },
  card: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Fondo glass para tarjetas
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#1e293b', // Título más oscuro para mejor contraste
    fontWeight: '700',
    fontSize: 28,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#475569', // Gris más oscuro
    fontWeight: '500',
    fontSize: 16,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  switchButton: {
    marginTop: 15,
  },

  cardTitle: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
  },
  outlinedButton: {
    marginTop: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
    borderWidth: 1.5,
    borderRadius: 12,
  },
})