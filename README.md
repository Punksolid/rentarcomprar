# Simulador: Comprar vs Invertir

Simulador financiero interactivo para comparar dos escenarios de inversión:
1. **Escenario 1**: Comprar inmueble y alquilarlo
2. **Escenario 2**: Invertir (cetes, sofipos, bolsa de valores) y pagar renta

## Desarrollo en GitHub Codespaces

### Instalar dependencias
```bash
npm install
```

### Iniciar servidor de desarrollo
```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000`. GitHub Codespaces automáticamente expondrá el puerto y te proporcionará una URL pública.

### Otros comandos
```bash
npm run build    # Crear build de producción
npm run preview  # Previsualizar build de producción
```

## Stack Tecnológico
- **React 18** - Framework UI
- **Vite** - Build tool y dev server
- **Recharts** - Visualización de datos
- **Tailwind CSS** - Estilos

## Estructura del Proyecto
```
├── src/
│   ├── App.jsx       # Componente principal del simulador
│   ├── main.jsx      # Punto de entrada React
│   └── index.css     # Estilos Tailwind
├── index.html        # Template HTML
├── vite.config.js    # Configuración Vite
└── package.json      # Dependencias
```
