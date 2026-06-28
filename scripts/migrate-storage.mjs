// Copy all Storage files from the OLD Supabase project to the NEW one.
//
// pg_dump migrates bucket rows + policies but NOT the stored files, so run this
// once after the database migration to carry avatars, CVs, deliverables and
// portfolio uploads across.
//
// Usage (PowerShell / bash):
//   OLD_SUPABASE_URL=https://dgyuafltlpruhdlgwiew.supabase.co \
//   OLD_SERVICE_KEY=<old service_role key> \
//   NEW_SUPABASE_URL=https://uwwmwerdfpyekgshkrft.supabase.co \
//   NEW_SERVICE_KEY=<new service_role key> \
//   node scripts/migrate-storage.mjs
//
// Get the service_role keys from each project's Settings -> API. They are
// admin keys — keep them out of version control and your shell history.

import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["avatars", "cv-uploads", "deliverables", "portfolio"];

const { OLD_SUPABASE_URL, OLD_SERVICE_KEY, NEW_SUPABASE_URL, NEW_SERVICE_KEY } = process.env;

if (!OLD_SUPABASE_URL || !OLD_SERVICE_KEY || !NEW_SUPABASE_URL || !NEW_SERVICE_KEY) {
  console.error(
    "Missing env. Required: OLD_SUPABASE_URL, OLD_SERVICE_KEY, NEW_SUPABASE_URL, NEW_SERVICE_KEY",
  );
  process.exit(1);
}

const oldClient = createClient(OLD_SUPABASE_URL, OLD_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const newClient = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Recursively list every file path within a bucket (handles nested folders).
async function listAll(client, bucket, prefix = "") {
  const out = [];
  const pageSize = 100;
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back with a null id; recurse into them.
      if (entry.id === null) out.push(...(await listAll(client, bucket, path)));
      else out.push(path);
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

async function ensureBucket(name) {
  const { data } = await newClient.storage.getBucket(name);
  if (!data) {
    const { data: src } = await oldClient.storage.getBucket(name);
    await newClient.storage.createBucket(name, {
      public: src?.public ?? false,
      fileSizeLimit: src?.file_size_limit ?? undefined,
      allowedMimeTypes: src?.allowed_mime_types ?? undefined,
    });
    console.log(`  created bucket "${name}" on new project`);
  }
}

let copied = 0;
let failed = 0;

for (const bucket of BUCKETS) {
  console.log(`\nBucket: ${bucket}`);
  try {
    await ensureBucket(bucket);
    const paths = await listAll(oldClient, bucket);
    console.log(`  ${paths.length} file(s) to copy`);
    for (const path of paths) {
      const { data: blob, error: dlErr } = await oldClient.storage.from(bucket).download(path);
      if (dlErr || !blob) {
        console.error(`  ✗ download ${path}: ${dlErr?.message || "no data"}`);
        failed++;
        continue;
      }
      const buffer = Buffer.from(await blob.arrayBuffer());
      const { error: upErr } = await newClient.storage
        .from(bucket)
        .upload(path, buffer, { upsert: true, contentType: blob.type || undefined });
      if (upErr) {
        console.error(`  ✗ upload ${path}: ${upErr.message}`);
        failed++;
      } else {
        copied++;
      }
    }
  } catch (e) {
    console.error(`  ! bucket ${bucket} failed: ${e instanceof Error ? e.message : e}`);
  }
}

console.log(`\nDone. Copied ${copied} file(s), ${failed} failure(s).`);
process.exit(failed > 0 ? 1 : 0);
