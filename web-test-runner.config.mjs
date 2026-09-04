import { playwrightLauncher } from "@web/test-runner-playwright";

export default {
  hostname: "localhost",
  nodeResolve: true,
  browsers: [playwrightLauncher({ product: "chromium" })],
  testFramework: {
    config: {
      timeout: 3000,
    },
  },
};
