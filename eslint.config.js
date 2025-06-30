// eslint.config.js
import { FlatCompat } from '@eslint/eslintrc';
import react from 'eslint-plugin-react';
import tseslint from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
  recommendedConfigs: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended'
  ]
});

export default [
  // 1) padrões de ignore (substitui .eslintignore)
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'public/**'
    ]
  },
  // 2) regras para arquivos JS/TS/JSX/TSX
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      react,
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y
    },
    settings: {
      react: { version: 'detect' }
    },
    // aplica as configs recomendadas de cada plugin
    ...compat.extends(),
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn'],
      'react/react-in-jsx-scope': 'off'
      // adicione/ajuste outras regras aqui
    }
  }
];
