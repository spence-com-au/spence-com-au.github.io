import { expect, test } from 'vitest';

import pkg from '../package.json' with { type: 'json' };

const major = (range: string) => range.match(/\d+/)?.[0];

// `@types/node` describes one Node major, and Dependabot is told to leave its majors alone because it cannot read the
// runtime's. Nothing else would notice a hand-edit of either side, or a runtime upgrade, leaving them apart.
test('`@types/node` is on the Node major `devEngines` pins', () => {
  expect(major(pkg.devDependencies['@types/node'])).toBe(major(pkg.devEngines.runtime.version));
});
