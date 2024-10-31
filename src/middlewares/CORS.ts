import cors from "cors";
import type { Application } from "express";
import Logger from "../logger";

class CORS {
  // CORS Options
  private corsOptions = {
    origin: "*", // This allows all origins
    methods: "GET, HEAD, PUT, PATCH, POST, DELETE",
    credentials: true, // This allows cookies to be sent with requests
    optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  };

  public mount(_express: Application): Application {
    Logger.info("App :: Registering CORS middleware...");

    _express.use(cors(this.corsOptions));

    return _express;
  }
}

export default new CORS();
