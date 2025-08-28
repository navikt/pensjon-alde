import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { reactRouterDevTools } from "react-router-devtools";

export default defineConfig({
    server: {
        port: 3001,
    },
    plugins: [reactRouterDevTools(), reactRouter(), tsconfigPaths()],
});
