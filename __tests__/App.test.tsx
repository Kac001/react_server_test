import React from 'react';
import renderer from 'react-test-renderer';

import App from '../App';

test('renders correctly', async () => {
  await renderer.act(async () => {
    renderer.create(<App />);
  });
});
