// Example route file to demonstrate routing structure
import express from "express";

const router = express.Router();

router.get("/example", (req, res) => {
  res.json({ message: "Example route is working!" });
});

export default router;