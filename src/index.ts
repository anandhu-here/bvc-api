import Logger from "./logger";
import App from "./app";

export const main = () => {
  // Run the Server
  Logger.info("App :: Starting...");

  const app = new App();

  app._init();

  return app;
};
