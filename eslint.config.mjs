import globals from 'globals'
import pluginJs from '@eslint/js'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {ignores: ['tests/*', 'src/db/models/index.js', 'src/db/migrations/*', 'src/db/seeders/*', '*.config.js', 'test.js']},
  {files: ['src/app/**/*.js'], languageOptions: { sourceType: 'commonjs' }},
  {
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
  },
  pluginJs.configs.recommended,
  {
    rules: {
      'comma-style': [2, 'last'],
      'computed-property-spacing': [2, 'never'],
      'eol-last': [2],
      'func-style': [1, 'declaration', {allowArrowFunctions: true}],
      indent: [2, 2, {MemberExpression: 1, SwitchCase: 1}],
      semi: [2, 'never'],
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
      curly: [2, 'multi-or-nest', 'consistent'],
    },
  },
]
