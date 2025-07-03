// Función utilitaria para mostrar alertas compatibles con web y React Native
export const showAlert = (title: string, message?: string, buttons?: Array<{text: string, onPress?: () => void}>) => {
  if (typeof window !== 'undefined' && window.alert) {
    // En navegador web
    const fullMessage = message ? `${title}\n\n${message}` : title
    
    if (buttons && buttons.length > 1) {
      // Para múltiples botones, usar confirm
      const result = window.confirm(fullMessage)
      if (result && buttons[1]?.onPress) {
        buttons[1].onPress()
      } else if (!result && buttons[0]?.onPress) {
        buttons[0].onPress()
      }
    } else {
      // Para un solo botón o sin botones, usar alert
      window.alert(fullMessage)
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress()
      }
    }
  } else {
    // En React Native
    const { Alert } = require('react-native')
    Alert.alert(title, message, buttons)
  }
}

export const showConfirm = (title: string, message?: string, onConfirm?: () => void, onCancel?: () => void) => {
  if (typeof window !== 'undefined' && window.confirm) {
    // En navegador web
    const fullMessage = message ? `${title}\n\n${message}` : title
    const result = window.confirm(fullMessage)
    
    if (result && onConfirm) {
      onConfirm()
    } else if (!result && onCancel) {
      onCancel()
    }
  } else {
    // En React Native
    const { Alert } = require('react-native')
    Alert.alert(title, message, [
      { text: 'Cancelar', onPress: onCancel },
      { text: 'Confirmar', onPress: onConfirm }
    ])
  }
}