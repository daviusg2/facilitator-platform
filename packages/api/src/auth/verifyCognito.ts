import jwt from "jsonwebtoken";
import { createPublicKey } from "crypto";

const region = process.env.COGNITO_REGION!;
const pool   = process.env.COGNITO_USER_POOL_ID!;
const audience = process.env.COGNITO_AUDIENCE!;

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

export async function verifyIdToken(token: string): Promise<any> {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || typeof decodedHeader !== "object") throw new Error("Malformed JWT");
  const kid = decodedHeader.header.kid;
  const pem = await getPemForKid(kid);

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      pem,
      {
        algorithms: ["RS256"],
        issuer: `https://cognito-idp.${region}.amazonaws.com/${pool}`,
        audience,
      },
      (err, payload) => {
        if (err) return reject(err);
        resolve(payload);
      }
    );
  });
}


