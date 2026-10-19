import { defineConfig } from "@playwright/test";

const PORT = 8799;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  use: { baseURL: `http://127.0.0.1:${PORT}`, channel: "chrome", headless: true },
  webServer: {
    command: `python serve.py --port ${PORT}`,
    cwd: "..",
    url: `http://127.0.0.1:${PORT}/api/scenarios`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
