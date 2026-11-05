export default {
  extends: ['html-validate:recommended'],
  rules: {
    'attribute-empty-style': 'off',
    'doctype-style': ['error', { style: 'lowercase' }],
    'void-style': 'off',
  },
};
