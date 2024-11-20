import globals from 'globals';
import pluginJs from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['src/app/**/*.js'], languageOptions: { sourceType: 'commonjs' } },
  {
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
  },
  pluginJs.configs.recommended,
  jsdoc.configs['flat/recommended'],
  {
    rules: {
      'no-unused-vars': 1,
      'no-undef': 0,
      'one-var': 0,
      'one-var-declaration-per-line': 0,
      'new-cap': 0,
      'consistent-return': 0,
      'no-param-reassign': 0,
      'no-confusing-arrow': 1,
      'arrow-body-style': 0,
      'arrow-parens': 0,
      'import/no-dynamic-require': 0,
      'comma-dangle': 0,
      curly: [2, 'multi-line'],
    },
  },
];
