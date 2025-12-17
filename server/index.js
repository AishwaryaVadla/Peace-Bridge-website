import express from "express";
import dotenv from "dotenv";
import chatRouter from "./routes/chat.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/chat", chatRouter);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
