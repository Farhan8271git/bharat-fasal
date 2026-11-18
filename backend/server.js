import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import app from "./src/app.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(
        `Bharat Fasal API running on http://localhost:${PORT}`
      );
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async (error) => {
        try {
          await mongoose.disconnect();

          if (error) {
            throw error;
          }

          console.log("Server and database connections closed.");
        } catch (shutdownError) {
          console.error("Shutdown failed:", shutdownError);
          process.exitCode = 1;
        }
      });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};
startServer();