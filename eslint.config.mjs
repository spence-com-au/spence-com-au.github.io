import globals from 'globals';
import { includeIgnoreFile } from 'eslint/config';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  includeIgnoreFile(`${import.meta.dirname}/.gitignore`),

  js.configs.recommended,
  ...tseslint.configs.strict,
  reactHooks.configs.flat.recommended,
  prettier,
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      'curly': ['error', 'all'],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'multiline-block-like' },
        { blankLine: 'always', prev: 'multiline-block-like', next: '*' },
      ],

      // A comment binds to the code below it, so the blank line above it is what marks where its scope begins — except
      // at the top of a block, where the brace already does and Prettier strips one. The blank line after the code it
      // covers is past what this can check.
      '@stylistic/lines-around-comment': [
        'error',
        {
          allowArrayStart: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowInterfaceStart: true,
          allowObjectStart: true,
          allowTypeStart: true,
          beforeBlockComment: true,
          beforeLineComment: true,
        },
      ],
    },
  },

  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
];
