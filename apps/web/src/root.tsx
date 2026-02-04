import { Outlet } from "react-router";
import "./index.css";

export default function Root() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>XtraClass</title>
      </head>
      <body>
        <Outlet />
      </body>
    </html>
  );
}
