import express from "express";
import next from "next";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Custom API route
  server.get("/api/hello", (req, res) => {
    res.json({ message: "Hello from Express!" });
  });

  // Let Next.js handle all other routes (frontend)
  server.all("/*", (req, res) => {
    return handle(req, res);
  });
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
