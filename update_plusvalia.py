#!/usr/bin/env python3
import re

file_path = '/workspaces/codespaces-blank/src/App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change 1: Update default value from 0 to 1
content = content.replace(
    'const [plusvaliaRealPct, setPlusvaliaRealPct] = useState(0);',
    'const [plusvaliaRealPct, setPlusvaliaRealPct] = useState(1);'
)

# Change 2: Replace the label and input with tooltip version
old_section = '''            <label htmlFor="plusvaliaRealPct" className="text-sm text-gray-700">Plusvalía real (% adicional)</label>
            <input id="plusvaliaRealPct" type="number" step={0.1} value={plusvaliaRealPct} onChange={e=>setPlusvaliaRealPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>'''

new_section = '''            <div className="flex items-center gap-2">
              <label htmlFor="plusvaliaRealPct" className="text-sm text-gray-700">Plusvalía real (% adicional)</label>
              <div className="relative group">
                <button
                  type="button"
                  aria-label="Ayuda: plusvalía real"
                  className="w-5 h-5 rounded-full border border-gray-300 text-gray-600 text-xs font-semibold leading-none flex items-center justify-center bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  ?
                </button>
                <div className="hidden group-hover:block group-focus-within:block absolute z-10 left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs text-gray-700">
                  <div className="font-semibold text-gray-900 mb-1">¿Qué es Plusvalía Real?</div>
                  <div>Es el crecimiento del valor del inmueble <b>por encima de la inflación</b>. Representa la apreciación real del activo a lo largo del tiempo.</div>
                  <div className="mt-1">El valor actual viene prerellenado con <b>1%</b>, que es una estimación realista y pesimista para el mercado inmobiliario mexicano (asume crecimiento moderado).</div>
                  <div className="mt-1 text-gray-600">Si no estás seguro de este valor, no lo modifiques; el simulador funcionará bien con esta estimación por defecto.</div>
                </div>
              </div>
            </div>
            <input id="plusvaliaRealPct" type="number" step={0.1} value={plusvaliaRealPct} onChange={e=>setPlusvaliaRealPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>'''

if old_section in content:
    content = content.replace(old_section, new_section)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('✓ Successfully updated plusvalía real with tooltip and default value')
else:
    print('✗ Could not find the section to replace')
    exit(1)
