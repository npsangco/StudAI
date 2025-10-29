import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  // Client-side (React) configuration
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['server/**', 'backend/**', '**/*.server.js', 'server.js'], // Ignore server files
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Server-side (Node.js) configuration
  {
    files: ['server/**/*.js', 'backend/**/*.js', '**/*.server.js', 'server.js'],
    languageOptions: {
      ecmaVersion: 2022, // ← Change this to 2022 or latest
      globals: {
        ...globals.node,
        ...globals.es2022, // ← Update this
      },
      sourceType: 'module',
    },
    parserOptions: {
      ecmaVersion: 'latest', // ← Add this
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])