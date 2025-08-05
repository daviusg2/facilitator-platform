import jwt from "jsonwebtoken";
import { createPublicKey } from "crypto";

const region = process.env.COGNITO_REGION!;
const pool   = process.env.COGNITO_USER_POOL_ID!;
const clientId = process.env.COGNITO_CLIENT_ID || process.env.COGNITO_AUDIENCE!; // Support both names

let jwksCache: Record<string, string> | null = null;

async function fetchJwks(): Promise<Record<string, string>> {
  const url = `https://cognito-idp.${region}.amazonaws.com/${pool}/.well-known/jwks.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const { keys } = await res.json();
  const map: Record<string, string> = {};
  for (const k of keys) {
    const pub = createPublicKey({ key: { kty: k.kty, n: k.n, e: k.e }, format: "jwk" }).export({ format: "pem", type: "spki" }).toString();
    map[k.kid] = pub;
  }
  return map;
}

async function getPemForKid(kid: string): Promise<string> {
  if (!jwksCache) jwksCache = await fetchJwks();
  if (!jwksCache[kid]) {           // cache miss → refetch once
    jwksCache = await fetchJwks();
    if (!jwksCache[kid]) throw new Error("Unknown JWKS kid");
  }
  return jwksCache[kid];
}

// Generic token verification that handles both access and id tokens
export async function verifyToken(token: string): Promise<any> {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || typeof decodedHeader !== "object") throw new Error("Malformed JWT");
  
  const kid = decodedHeader.header.kid;
  const pem = await getPemForKid(kid);
  
  // Decode to check token type
  const decoded = jwt.decode(token) as any;
  const tokenUse = decoded?.token_use;

  return new Promise((resolve, reject) => {
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ["RS256"],
      issuer: `https://cognito-idp.${region}.amazonaws.com/${pool}`,
    };

    // Only add audience check for id_tokens
    if (tokenUse === 'id') {
      verifyOptions.audience = clientId;
    }
    // For access_tokens, we could verify client_id claim if needed
    // but jwt.verify doesn't have a built-in option for this

    jwt.verify(token, pem, verifyOptions, (err, payload) => {
      if (err) return reject(err);
      
      // Additional validation for access_tokens
      if (tokenUse === 'access' && payload && typeof payload === 'object') {
        // Verify client_id matches if it's an access token
        if (payload.client_id !== clientId) {
          return reject(new Error('Invalid client_id'));
        }
      }
      
      resolve(payload);
    });
  });
}

// Keep the old function for backward compatibility
export async function verifyIdToken(token: string): Promise<any> {
  return verifyToken(token);
}


