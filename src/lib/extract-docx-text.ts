import JSZip from "jszip";

/**
 * Extracts plain text from a .docx file client-side.
 *
 * A .docx is a zip archive whose body text lives in word/document.xml — it is
 * NOT readable by decoding the raw file bytes as UTF-8 (that was the bug this
 * replaces: ATSChecker.tsx and LinkedInAnalyzer.tsx both did exactly that,
 * which can't work since the archive is deflate-compressed). Unzips properly
 * and strips the XML instead, mirroring supabase/functions/parse-cv's
 * server-side extractDocx().
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const doc = zip.file("word/document.xml");
  if (!doc) return "";
  const xml = await doc.async("string");
  const withBreaks = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n");
  const text = withBreaks.replace(/<[^>]+>/g, "");
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}
