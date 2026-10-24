import test from "node:test";
import assert from "node:assert/strict";
import { signRequest } from "../src/storage/sigv4.ts";

// Published AWS documentation examples ("Signature Calculations for the Authorization Header: Transferring Payload
// in a Single Chunk", Amazon S3 API reference). The keys are AWS's documented example keys, not credentials.
const credentials = { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" };
const date = new Date("2013-05-24T00:00:00Z");
const emptyPayload = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

test("SigV4 reproduces the AWS GET Object example signature", () => {
  const signed = signRequest({ method: "GET", url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
    headers: { range: "bytes=0-9" }, payloadHash: emptyPayload, region: "us-east-1", credentials, date });
  assert.equal(signed.authorization, "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request," +
    "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
  assert.equal(signed["x-amz-date"], "20130524T000000Z");
  assert.equal(signed["x-amz-content-sha256"], emptyPayload);
});

test("SigV4 reproduces the AWS PUT Object example signature, including path encoding of $", () => {
  const signed = signRequest({ method: "PUT", url: new URL("https://examplebucket.s3.amazonaws.com/test$file.text"),
    headers: { date: "Fri, 24 May 2013 00:00:00 GMT", "x-amz-storage-class": "REDUCED_REDUNDANCY" },
    payloadHash: "44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072", region: "us-east-1", credentials, date });
  assert.match(signed.authorization, /SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class,/);
  assert.match(signed.authorization, /Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd$/);
});

test("SigV4 control: a different secret yields a different signature", () => {
  const sign = (secretAccessKey: string) => signRequest({ method: "GET", url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
    headers: {}, payloadHash: emptyPayload, region: "us-east-1", credentials: { ...credentials, secretAccessKey }, date }).authorization;
  assert.notEqual(sign("a"), sign("b"));
});
