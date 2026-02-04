// backend/.eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'no-console': 'off', // Allow console for logging
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-undef': 'error',
    'no-var': 'error',
    'prefer-const': 'warn',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'indent': ['warn', 2, { SwitchCase: 1 }],
    'comma-dangle': ['warn', 'never'],
    'arrow-spacing': 'error',
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never']
  }
};
