// components/LoginScreen.tsx - Componente de login
import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { showAlert } from '../lib/alerts'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TextInput, Button, Text, Card } from 'react-native-paper'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) showAlert('Error', error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    if (password !== confirmPassword) {
      showAlert('Error', 'Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      showAlert('Error', 'La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) {
      showAlert('Error', error.message)
    } else {
      showAlert('Éxito', 'Revisa tu email para confirmar la cuenta')
    }
    
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </Text>
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          
          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          
          {isSignUp && (
            <TextInput
              label="Confirmar Contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
            />
          )}
          
          <Button
            mode="contained"
            onPress={isSignUp ? signUpWithEmail : signInWithEmail}
            loading={loading}
            style={styles.button}
          >
            {isSignUp ? 'Registrarse' : 'Ingresar'}
          </Button>
          
          <Button
            mode="text"
            onPress={() => setIsSignUp(!isSignUp)}
            style={styles.switchButton}
          >
            {isSignUp 
              ? '¿Ya tienes cuenta? Inicia sesión' 
              : '¿No tienes cuenta? Regístrate'
            }
          </Button>
        </Card.Content>
      </Card>
      </View>
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
    justifyContent: 'center',
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
  },
  switchButton: {
    marginTop: 15,
  },
  logoutButton: {
    marginTop: 30,
  },
})