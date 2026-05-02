export default {
  testDir: './tests',
  webServer: {
    command: 'bun run dev --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure'
  }
};
