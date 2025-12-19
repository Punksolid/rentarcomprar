# Copilot Instructions

## Project Overview
Single-page React financial simulator comparing real estate investment (buy & rent out) vs financial investment (cetes, sofipos, bolsa de valores) (invest & pay rent). Mexican context with MXN currency, inflation indexing, and Mexican tax calculations (ISR on rental income and interest).

## Architecture
- **Single component**: [index.jsx](../index.jsx) contains the entire app
- **No build system**: Direct JSX file (likely served via tooling like Vite or similar)
- **State management**: React useState hooks for ~20 user-configurable parameters
- **Visualization**: Recharts library (LineChart, BarChart) for patrimony evolution and cash flow
- **Styling**: Tailwind CSS utility classes

## Key Patterns

### Financial Simulation Model
Two independent scenarios simulated year-by-year:
1. **Scenario 1** (`simularEscenario1`): Buy property + collect rent
   - Tracks: property appreciation, rental income (indexed), maintenance, predial tax, ISR on rental income
   - Result: `valorCasa + efectivo` = total patrimony
2. **Scenario 2** (`simularEscenario2`): Invest (cetes, sofipos, bolsa de valores) + pay rent
   - Tracks: capital growth with interest, rent payments (indexed), ISR on interest
   - Result: `capital` = accumulated investment

Both scenarios:
- Run for configurable horizon (5, 10, or custom years)
- Apply annual inflation to relevant variables when indexing enabled
- Calculate after-tax cash flows with two ISR modes

### Tax Calculation Specifics
- **Rental ISR** (Scenario 1): Two modes
  - `ciega` (blind deduction): `base = rentaAnual × (1 - deduccionCiegaPct/100)`, default 35% deduction
  - `real` (actual expenses): `base = rentaAnual - mantenimiento - predial`
  - Apply `isrRentaPct` to base (default 20%)
- **Interest ISR** (Scenario 2): 
  - Option to tax only real interest: `interesReal = intereses - capital × inflacion`
  - Apply `isrInteresesPct` to base (default 20%)

### State & Memoization
- All ~20 parameters use individual `useState` hooks (no reducer or context)
- Three memoized results computed via `useMemo`: `r5`, `r10`, `rh` (5-year, 10-year, horizon-specific)
- Dependency arrays include all relevant parameters - changes trigger recalculation

### Data Transformations
`construirSerie(anios)` combines both scenarios into chart-ready arrays:
- `data`: year-by-year patrimony for line chart (`totalEsc1`, `totalEsc2`)
- `dataFlow`: year-by-year net cash flow for bar chart (`flowEsc1`, `flowEsc2`)

### UI Layout
- **Grid-based controls**: 4 sections (asset params, scenario 1, scenario 2, horizon)
- **Charts**: Full-width responsive containers (320px height)
- **Results**: 3-column summary cards showing 5yr, 10yr, custom horizon comparisons
- Color coding: green for positive difference (E1 > E2), red for negative

## Development Workflow
- **Build tool**: Vite configured for React with HMR (Hot Module Replacement)
- **Dev server**: `npm run dev` starts on port 3000 (auto-exposed in Codespaces)
- **Dependencies**: React 18+, Recharts, Tailwind CSS (all in package.json)
- **Project structure**: 
  - `src/App.jsx` - Main simulator component
  - `src/main.jsx` - React entry point
  - `index.html` - HTML template

## Conventions
- Variable names in Spanish (`precio`, `renta`, `predial`) - maintain this for domain clarity
- Percentage inputs stored as raw numbers (5 = 5%), converted to decimals (0.05) for calculations
- Currency formatting: `mxn.format()` using Intl.NumberFormat with es-MX locale
- Boolean flags for behavior switches: `rentaRecibidaIndexa`, `gravaInteresReal`

## When Modifying
- **Adding parameters**: Create new `useState`, add to dependency arrays of all three `useMemo` calls
- **Changing tax logic**: Update `simularEscenario1`/`simularEscenario2` - ensure annual loop maintains year-over-year state correctly
- **New visualizations**: Extract data in `construirSerie` - Recharts expects `{anio, key1, key2, ...}` format
- **Performance**: If adding expensive calculations, wrap in `useMemo` with precise dependencies

## Financial Logic Notes
- Property value compounds: `valorCasa *= (1 + inflacion) × (1 + plusvaliaReal)` each year
- Rent indexing multiplies by `(1 + inflacion)` when enabled
- Maintenance expressed as "months of rent per year" (default 1 month)
- Predial calculated as percentage of current property value (not original price)
- Scenario 2 reinvests net flow: `capital = capital + (intereses + aportacion - rentaPagada - isrIntereses)`
