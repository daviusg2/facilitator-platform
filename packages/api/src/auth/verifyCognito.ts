import jwkToPem from "jwk-to-pem";
import jwt, { JwtPayload } from "jsonwebtoken";

const region     = process.env.COGNITO_REGION!;
const userPoolId = process.env.COGNITO_USER_POOL_ID!;
const audience   = process.env.COGNITO_AUDIENCE!;

if (!region || !userPoolId || !audience) {
  throw new Error(`Auth env missing: region=${region} pool=${userPoolId} aud=${audience}`);
}

let pemCache: Record<string, string> | null = null;

async function getPems() {
  if (pemCache) return pemCache;
  const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  const res = await fetch(jwksUrl);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`JWKS fetch failed: ${res.status} ${text.slice(0,120)}`);
  }
  const { keys } = await res.json() as { keys: any[] };
  pemCache = {};
  for (const k of keys) {
    pemCache[k.kid] = jwkToPem(k);
  }
  return pemCache;
}


export interface CognitoClaims extends JwtPayload {
  email?: string;
  "custom:orgId"?: string;
  "custom:role"?: string;
}

export async function verifyIdToken(token: string): Promise<CognitoClaims> {
  try {
    const [headerB64] = token.split(".");
    if (!headerB64) throw new Error("Malformed token");
    const headerJson = Buffer.from(headerB64, "base64").toString();
    const header = JSON.parse(headerJson);
    const kid = header.kid;
    if (!kid) throw new Error("Missing kid");

    const pems = await getPems();
    const pem = pems[kid];
    if (!pem) {
      console.error("AUTH DEBUG: KID not in JWKS", { kid, availableKids: Object.keys(pems) });
      throw new Error("Unknown kid");
    }

    return await new Promise<CognitoClaims>((resolve, reject) => {
      jwt.verify(
        token,
        pem,
        {
          audience,
          issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
        },
        (err, decoded: any) => {
          if (err) {
            console.error("AUTH DEBUG: jwt.verify error", {
              message: err.message,
              name: err.name,
              audienceEnv: audience,
              tokenUse: decoded?.token_use,
              tokenAud: decoded?.aud,
              exp: decoded?.exp,
              now: Math.floor(Date.now() / 1000),
            });
            return reject(err);
          }
          console.log("AUTH DEBUG: success header.kid =", kid);
          resolve(decoded as CognitoClaims);
        }
      );
    });
  } catch (e: any) {
    console.error("AUTH DEBUG: outer catch full error", {
      message: e.message,
      stack: e.stack,
      name: e.name,
      cause: e.cause,
      type: typeof e,
    });
    throw e;
  }
}

