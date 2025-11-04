import express from "express";
import { shortenPostRequestBodySchema } from "../validation/request.validation.js";
import { userTable } from "../models/user.model.js";
import { eq } from "drizzle-orm";
import { nanoid } from "zod";
import db from "../db/index.js";
import { urlsTable } from "../models/url.model.js";
import { ensureAuthenticated } from "../middlewares/auth.middleware.js";

const router = express.Router();

//get all the codes

router.get("/codes", ensureAuthenticated,  async (req, res) => {
  try {
    const codes = await db
    .select()
    .from(urlsTable)
    .where(eq(urlsTable.userId, req.user.id));
    return res.status(200).json({codes})
  } catch (error) {
    return res.status(500).json({error: 'Failed to fetch URLs'})
  }
});

//shorten post request

router.post("/shorten", ensureAuthenticated, async (req, res) => {
  const validationResult = await shortenPostRequestBodySchema.safeParseAsync(
    req.body
  );

  if (validationResult.error) {
    return res.status(400).json({ error: validationResult.error.message });
  }

  const { url, code } = validationResult.data;

  const shortCode = code ?? nanoid(6);
  const [result] = await db
    .insert(urlsTable)
    .values({
      shortCode,
      targetURL: url,
      userId: req.user.id,
    })
    .returning({
      id: userTable.id,
      shortCode: urlsTable.shortCode,
      targetURL: urlsTable.targetURL,
    });
  return res.status(201).json({
    id: result.id,
    shortCode: result.shortCode,
    targetURL: result.targetURL,
  });
});

router.get("/:shortCode", async (req, res) => {
  const code = req.params.shortCode;
  const [result] = await db
    .select({
      targetURL: urlsTable.targetURL,
    })
    .from(urlsTable)
    .where(eq(urlsTable.shortCode, code));

  if (!result) {
    return res.status(404).json({ error: "invalid url" });
  }

  return res.redirect(result.targetURL);
});



export default router;
