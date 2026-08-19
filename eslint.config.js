import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // shadcn exporta variantes (cva) junto al componente, y AuthContext exporta
    // el hook junto al provider: ninguno rompe nada, solo el fast refresh fino.
    files: ['src/components/ui/**/*.tsx', 'src/auth/AuthContext.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
