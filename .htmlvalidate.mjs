export default {
  extends: ['html-validate:recommended'],
  rules: {
    'doctype-style': ['error', { style: 'lowercase' }],

    // What this checks is the built page, whose markup Vite and React write rather than anyone here, so a rule about
    // how the markup is spelled rather than whether it is valid has nobody to obey it. Prettier formats `index.html`.
    'attribute-empty-style': 'off',
    'void-style': 'off',
  },
};
