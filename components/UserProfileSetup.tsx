// components/UserProfileSetup.tsx - Componente para configurar perfil de usuario
import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { showAlert } from '../lib/alerts'
import { TextInput, Button, Text, Card, Portal, Modal } from 'react-native-paper'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

interface UserProfileSetupProps {
  user: User
  onProfileComplete: () => void
}

export default function UserProfileSetup({ user, onProfileComplete }: UserProfileSetupProps) {
  const [visible, setVisible] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkUserProfile()
  }, [user])

  const checkUserProfile = () => {
    // Verificar si el usuario tiene display_name
    const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name
    
    if (!displayName) {
      setVisible(true)
    } else {
      onProfileComplete()
    }
  }

  const saveProfile = async () => {
    if (!nombre.trim()) {
      showAlert('Error', 'El nombre es obligatorio')
      return
    }

    setLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: nombre.trim(),
          phone: telefono.trim() || null
        }
      })

      if (error) {
        showAlert('Error', 'No se pudo guardar el perfil: ' + error.message)
        setLoading(false)
        return
      }

      setVisible(false)
      onProfileComplete()
    } catch (error) {
      showAlert('Error', 'Ocurrió un error al guardar el perfil')
    }
    
    setLoading(false)
  }

  return (
    <Portal>
      <Modal 
        visible={visible} 
        dismissable={false}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Completa tu perfil
            </Text>
            
            <Text variant="bodyMedium" style={styles.subtitle}>
              Para continuar, necesitamos algunos datos básicos:
            </Text>
            
            <TextInput
              label="Nombre completo *"
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
              autoCapitalize="words"
            />
            
            <TextInput
              label="Teléfono (opcional)"
              value={telefono}
              onChangeText={setTelefono}
              style={styles.input}
              keyboardType="phone-pad"
            />
            
            <Button
              mode="contained"
              onPress={saveProfile}
              loading={loading}
              style={styles.button}
            >
              Guardar y continuar
            </Button>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
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
})