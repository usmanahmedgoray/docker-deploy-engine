import express, { type Request, type Response } from "express";
import { managementAppRoutes } from "./routes/managementApp.route";

// Server for management App
const managementApp = express();

// middleware for management App
managementApp.use(express.json());

// Using routes for management App
managementApp.use("/", managementAppRoutes);

// Routes for management App
managementApp.get("/", (req: Request, res: Response) => {
    res.send("Hello World!");
});

// Handling 404 
managementApp.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Not Found" });
});

// Handling 500
managementApp.use((err: Error, req: Request, res: Response) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});

managementApp.listen(3000, () => {
    console.log("Server is running on port 3000");
});
