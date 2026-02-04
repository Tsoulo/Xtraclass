import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("./pages/index.tsx"),
  route("*", "./pages/not-found.tsx"),
] satisfies RouteConfig;
