import { Router } from "express";
import { Service } from "../models/Service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const services = await Service.find().sort({ createdAt: 1 });
    return res.json({ services });
  } catch (error) {
    return next(error);
  }
});

export default router;
