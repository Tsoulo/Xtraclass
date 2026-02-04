import { toWeb } from "h3";
import app from "./index.js";

export default {
  fetch: app,
};

export const config = {
  runtime: "nodejs_compat",
};
