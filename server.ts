import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(process.env.DATABASE_URL || "./garage.db");
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    garage_name TEXT
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    owner_name TEXT,
    phone TEXT,
    vehicle_number TEXT,
    make TEXT,
    model TEXT,
    last_service_date TEXT,
    next_service_date TEXT,
    notes TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- Auth Routes ---
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, garageName } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (email, password, garage_name) VALUES (?, ?, ?)");
      const result = stmt.run(email, hashedPassword, garageName);
      const token = jwt.sign({ userId: result.lastInsertRowid, email, garageName }, JWT_SECRET);
      res.json({ token, user: { email, garageName } });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ userId: user.id, email: user.email, garageName: user.garage_name }, JWT_SECRET);
      res.json({ token, user: { email: user.email, garageName: user.garage_name } });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Vehicle Routes ---
  app.get("/api/vehicles", authenticate, (req: any, res) => {
    const vehicles = db.prepare("SELECT * FROM vehicles WHERE user_id = ? ORDER BY id DESC").all(req.user.userId);
    res.json(vehicles);
  });

  app.post("/api/vehicles", authenticate, (req: any, res) => {
    const { owner_name, phone, vehicle_number, make, model, last_service_date, next_service_date, notes } = req.body;
    const stmt = db.prepare(`
      INSERT INTO vehicles (user_id, owner_name, phone, vehicle_number, make, model, last_service_date, next_service_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.user.userId, owner_name, phone, vehicle_number, make, model, last_service_date, next_service_date, notes);
    res.json({ id: result.lastInsertRowid, ...req.body });
  });

  app.put("/api/vehicles/:id", authenticate, (req: any, res) => {
    const { owner_name, phone, vehicle_number, make, model, last_service_date, next_service_date, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE vehicles 
      SET owner_name = ?, phone = ?, vehicle_number = ?, make = ?, model = ?, last_service_date = ?, next_service_date = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(owner_name, phone, vehicle_number, make, model, last_service_date, next_service_date, notes, req.params.id, req.user.userId);
    res.json({ success: true });
  });

  app.delete("/api/vehicles/:id", authenticate, (req: any, res) => {
    const stmt = db.prepare("DELETE FROM vehicles WHERE id = ? AND user_id = ?");
    stmt.run(req.params.id, req.user.userId);
    res.json({ success: true });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
