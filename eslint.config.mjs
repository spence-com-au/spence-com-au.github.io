import globals from 'globals';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import stylistic from '@stylistic/eslint-plugin';

export default [
  {
    ignores: ['.claude/worktrees/**', '_site/**'],
  },

  js.configs.recommended,
  prettier,
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      'curly': ['error', 'all'],
      'padding-line-between-statements': [
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
          beforeBlockComment: true,
          beforeLineComment: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowObjectStart: true,
          allowArrayStart: true,
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
