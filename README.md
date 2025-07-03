# CanchaApp ⚽

Aplicación móvil para la gestión de reservas de canchas deportivas, desarrollada con React Native y Expo. Permite administrar reservas, ventas, productos y el control de caja de manera integral.

## 🚀 Características

- **Gestión de Reservas**: Crear, visualizar y administrar reservas de canchas
- **Calendario Interactivo**: Vista de calendario con navegación intuitiva
- **Sistema de Ventas**: Registro de ventas de productos y servicios
- **Control de Caja**: Seguimiento de ingresos y egresos
- **Gestión de Productos**: Administración de inventario (bebidas, kiosco)
- **Autenticación**: Sistema de login seguro con Supabase
- **Interfaz Moderna**: Diseño glass morphism con React Native Paper

## 🛠️ Tecnologías

- **Frontend**: React Native 0.79.5, Expo ~53.0
- **Navegación**: Expo Router (file-based routing)
- **UI/UX**: React Native Paper, Material Design
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Estado**: React Hooks
- **Lenguaje**: TypeScript

## 📋 Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Expo CLI
- Cuenta de Supabase

## ⚙️ Configuración

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd CanchaApp
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` con tus credenciales de Supabase:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=tu_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

4. **Configurar base de datos**
   - Ejecutar los scripts SQL en tu proyecto de Supabase:
     - `get_user_display_names.sql`
     - Otros archivos `.sql` según sea necesario

## 🚀 Comandos de Desarrollo

### Desarrollo Local
```bash
# Iniciar servidor de desarrollo
npm start
# o
expo start

# Abrir en Android
npm run android
# o
expo start --android

# Abrir en iOS
npm run ios
# o
expo start --ios

# Abrir en web
npm run web
# o
expo start --web
```

### Vista Previa
```bash
# Vista previa con Expo Go
expo start --go

# Vista previa en túnel (para dispositivos remotos)
expo start --tunnel

# Vista previa local
expo start --localhost
```

## 📱 Compilación para Producción

### Usando EAS Build (Recomendado)

1. **Instalar EAS CLI**
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Configurar EAS**
   ```bash
   eas login
   eas build:configure
   ```

3. **Compilar para Android**
   ```bash
   # APK para testing
   eas build --platform android --profile preview
   
   # AAB para Google Play Store
   eas build --platform android --profile production
   ```

4. **Compilar para iOS**
   ```bash
   # Para testing interno
   eas build --platform ios --profile preview
   
   # Para App Store
   eas build --platform ios --profile production
   ```

5. **Compilar para ambas plataformas**
   ```bash
   eas build --platform all
   ```

### Usando Expo Build (Clásico)

```bash
# Android APK
expo build:android -t apk

# Android App Bundle
expo build:android -t app-bundle

# iOS
expo build:ios
```

## 📁 Estructura del Proyecto

```
CanchaApp/
├── app/                    # Rutas de la aplicación (Expo Router)
│   ├── (tabs)/            # Navegación por pestañas
│   │   ├── calendario.tsx  # Pantalla de calendario
│   │   ├── caja.tsx       # Control de caja
│   │   ├── index.tsx      # Pantalla principal
│   │   └── ventas.tsx     # Gestión de ventas
│   ├── nueva-reserva.tsx  # Crear nueva reserva
│   └── nueva-venta.tsx    # Crear nueva venta
├── components/            # Componentes reutilizables
├── lib/                   # Configuración y utilidades
│   ├── supabase.ts       # Cliente de Supabase
│   └── alerts.ts         # Sistema de alertas
├── assets/               # Recursos estáticos
└── *.sql                 # Scripts de base de datos
```

## 🔧 Scripts Disponibles

- `npm start` - Iniciar servidor de desarrollo
- `npm run android` - Abrir en Android
- `npm run ios` - Abrir en iOS
- `npm run web` - Abrir en navegador web
- `npm run lint` - Ejecutar linter
- `npm run reset-project` - Resetear proyecto

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto es privado y está protegido por derechos de autor.

## 📞 Soporte

Para soporte técnico o consultas, contactar al equipo de desarrollo.
