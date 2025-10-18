module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.config.js', '*.config.cjs'],
  env: {
    node: true,
    es2022: true,
  },
};
