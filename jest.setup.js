jest.mock('react-native-tcp-socket', () => ({
  createConnection: (_options, onConnect) => {
    const socket = {
      destroy: jest.fn(),
      setTimeout: jest.fn(),
      on: jest.fn(),
    };

    if (typeof onConnect === 'function') {
      onConnect();
    }

    return socket;
  },
}));
