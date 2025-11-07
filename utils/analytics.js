import { randomUUID } from "crypto";
import db from "../db/index.js";
import { geoCacheTable } from "../models/geoCache.model.js";
import { eq, and, sql } from "drizzle-orm";
import axios from "axios";

//generate or get the visitor ID from the cookie
export const getVisitorId = (req, res) => {
  const cookieName = "visitor_id";
  let visitorId = req.cookies?.[cookieName];

  //if no cookie exists that means user may be first time visitor
  //generate a new cookie for the user
  if (!visitorId) {
    visitorId = randomUUID();
    //set cookie (expires in 1 year)
    res.cookie(cookieName, visitorId, {
      maxAge: 365 * 24 * 60 * 60 * 1000, //1 year
      httpOnly: false,
      secure: process.env.NODE_ENV === "production", //https only in production
      sameSite: "lax",
    });
  }
  return visitorId;
};

//get the geolocation from the cache or through api

export const getGeoData = async (ipAddress) => {
  //skip saving the ip if ip is localhost or private
  if (
    !ipAddress ||
    ipAddress === "unknown" ||
    ipAddress === "127.0.0.1" ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.')
  ){
    return null;
  }

  try {
    // if cached get the cached data from the db
    const [cached] = await db
        .select()
        .from(geoCacheTable)
        .where(
            and(
                eq(geoCacheTable.ipAddress, ipAddress),
                sql `${geoCacheTable.expiresAt} > NOW()`
            )
        )

        if(cached){
            //return the cached data instead of the calling the api
            return {
                country: cached.country,
                countryName: cached.countryName,
                region: cached.region,
                city: cached.city,
                postalCode: cached.postalCode,
                timezone: cached.timezone,
                location: cached.location,
                org: cached.org
            };
        }

        //cache miss - fetch from ipinfo.io api
        const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';
        const apiUrl = IPINFO_TOKEN
            ? `https://ipinfo.io/${ipAddress}/json?token=${IPINFO_TOKEN}`
            : `https://ipinfo.io/${ipAddress}/json`;
            const response = await axios.get(apiUrl);
            const data = response.data;
            //

            const geoData = {
                country: data.country || null,
                coutryName: data.country || null,
                region: data.region || null,
                city: data.city || null,
                postalCode: data.postal || null,
                timezone: data.timezone || null,
                location: data.loc || null,
                org: data.org || null
            };

            //cache the result (30 days)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate()+30);

            await db
                .insert(geoCacheTable)
                .values({
                    ipAddress: ipAddress,
                    ...geoData,
                    expiresAt: expiresAt
                })
                .onConflictDoUpdate({
                    target: geoCacheTable.ipAddress,
                    set: {
                        ...geoData,
                        cachedAt: sql `NOW()`,
                        expiresAt: expiresAt
                    }
                })
                .catch(err => console.error('Error caching geo data', err));

                return geoData;
  } catch (error) {
    console.error('Error fetching geo data', error);
    return null;
  }
};

//parse the user agent 
export const parseUserAgent = (userAgent) => {
    if(!userAgent || userAgent === 'unknown'){
        return {
            device: 'unknown',
            browser: 'unknown',
            os: 'unknown'
        };
    }

    const ua = userAgent.toLowerCase();
    
    //detect device
    let device = 'desktop';
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
        device = 'mobile';
      } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
        device = 'tablet';
      }
    //detect browser
    let browser = 'unknown';
    if(ua.includes('chrome') && !ua.includes('edg')){
        browser = 'Chrome';
    }else if(ua.includes('firefox')){
        browser = 'Firefox';
    }else if(ua.includes('safari') && !ua.includes('chrome')){
        browser = 'Safari';
    }else if(ua.includes('edg')){
        browser = 'Edge';
    }else if(ua.includes('opera') || ua.includes('opr')){
        browser = 'Opera';
    }
    
    //detect os
  let os = 'unknown';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os') || ua.includes('macos')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  }

  return { device, browser, os };
}
