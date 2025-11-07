import express, { urlencoded } from "express";
import { shortenPostRequestBodySchema, updateUrlRequestBodySchema } from "../validation/request.validation.js";
import { userTable } from "../models/user.model.js";
import { eq, and, One } from "drizzle-orm";
import { nanoid, url } from "zod";
import db from "../db/index.js";
import { urlsTable } from "../models/url.model.js";
import { ensureAuthenticated } from "../middlewares/auth.middleware.js";
import { clicksTable } from "../models/clicks.model.js";
import { getGeoData, getVisitorId, parseUserAgent } from "../utils/analytics.js";

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
      id: urlsTable.id,
      shortCode: urlsTable.shortCode,
      targetURL: urlsTable.targetURL,
    });
  return res.status(201).json({
    id: result.id,
    shortCode: result.shortCode,
    targetURL: result.targetURL,
  });
});

//edit route for targetUrl and shortCode

router.patch('/urls/:id', ensureAuthenticated, async (req, res) => {
    try {
      const urlId = req.params.id;

    const validationResult = await updateUrlRequestBodySchema.safeParseAsync(req.body);

    if(validationResult.error){
      return res.status(400).json({error: validationResult.error.message})
    }

    const {url: newTargetURL, code: newShortCode} = validationResult.data;

    const [url] = await db.select({
      id: urlsTable.id,
      userId: urlsTable.userId,
      shortCode: urlsTable.shortCode,
      targetURL: urlsTable.targetURL
    })
    .from(urlsTable)
    .where(
      and(
        eq(urlsTable.id, urlId),
        eq(urlsTable.userId, req.user.id)
      )
    );

    if(!url){
      return res.status(404).json({
        error: 'URL not found or you do not have the permission to update the url'
      });
    }

    if(newShortCode && newShortCode !== url.shortCode){

      const [existingUrl] = await db
        .select({id: urlsTable.id})
        .from(urlsTable)
        .where(eq(urlsTable.shortCode, newShortCode));

        if(existingUrl){
          return res.status(409).json({
            error: 'Short code is already taken. Please choose a different shortCode'
          })
        }
    }

    const updateData = {};

    //i gonna update only the fields which are provided
    if(newTargetURL){
      updateData.targetURL = newTargetURL;
    }

    if(newShortCode){
      updateData.shortCode = newShortCode;
    }

    //if no fields to update, return error
    if(Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No fields to update. Provide at least one field (url or code)'
      })
    }

    //finally update kro 
    const [updatedUrl] = await db
      .update(urlsTable)
      .set(updateData)
      .where(eq(urlsTable.id, urlId))
      .returning({
        id: urlsTable.id,
        shortCode: urlsTable.shortCode,
        targetURL: urlsTable.targetURL,
        updatedAt: urlsTable.updatedAt,
      })

      return res.status(200).json({
        message: 'URL updated successfully',
        url: updatedUrl
      })    
    } catch (error) {
      console.error('Error updating URL:', error);
      return res.status(500).json({
        error: 'Failed to update URL. Please try again.'
      });
    }

})

router.delete('/urls/:id', ensureAuthenticated, async (req, res) => {
  try {
    const urlId = req.params.id;

  const [url] = await db.select({
    id: urlsTable.id,
    userId: urlsTable.userId,
    shortCode: urlsTable.shortCode,
  })
  .from(urlsTable)
  .where(
    and(
      eq(urlsTable.id, urlId),
      eq(urlsTable.userId, req.user.id)
    )
  )

  if(!url){
    return res.status(404).json({
      error: 'URL not found or you do not have permission to delete it'
    })
  }

  await db
  .delete(urlsTable)
  .where(eq(urlsTable.id, urlId));

  return res.status(200).json({
    message: 'URL deleted successfully',
    deletedId: urlId,
    shortCode: url.shortCode
  })
  } catch (error) {
    console.error('Error deleting URL:', error);
    return res.status(500).json({ 
      error: 'Failed to delete URL. Please try again.' 
    });
  }
})

router.get("/:shortCode", async (req, res) => {

  // add the click tracking logic 
    try {
      const code = req.params.shortCode;
  const [result] = await db
    .select({
      id: urlsTable.id,
      targetURL: urlsTable.targetURL,
    })
    .from(urlsTable)
    .where(eq(urlsTable.shortCode, code));

  if (!result) {
    return res.status(404).json({ error: "invalid url" });
  }

  //get visitor if from cookie or generate new one

  const visitorId = getVisitorId(req, res);

  //extract the exact client isp ip
  const getClientIP = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if(forwardedFor){
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      return ips[0];
    }

    if(req.ip){
      return req.ip;
    }

    return req.connection?.remoteAddress || 'unknown';
  };

  const clientIP = getClientIP(req);

  //parse the user agent
  const userAgent = req.headers['user-agent'] || 'unknown';
  const { device, browser, os} = parseUserAgent(userAgent);

  //get geolocation cached data from db or from ipinfo.io api

  const geoData = await getGeoData(clientIP);

  //track click (async why so that redirect occurs instantly and the insertion logic is being exceuted simuntaneosly)
  const clickData = {
    urlId: result.id,
    visitorId: visitorId,
    ipAddress: clientIP,
    userAgent: userAgent,
    referrer: req.headers['referer'] || req.headers['referrer'] || null,
    //geolocation data
    country: geoData?.country || null,
    countryName: geoData?.countryName || null,
    region: geoData?.countryName ||  null,
    city: geoData?.city || null,
    postalCode: geoData?.postalCode || null,
    timezone: geoData?.timezone || null,
    location: geoData?.location || null,
    org: geoData?.org || null,
    //device/browser data
    device: device,
    browser: browser,
    os: os
  }


  db.insert(clicksTable)
    .values(clickData)
    .catch(err => console.error('Error tracking click', err));

  return res.redirect(result.targetURL);
    } catch (error) {
      console.error('Error in redirect:', error);
    return res.status(500).json({ error: "Server error" });
    }
});



export default router;
