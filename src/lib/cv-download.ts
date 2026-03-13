import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, TabStopPosition, TabStopType } from "docx";
import { saveAs } from "file-saver";

interface CVData {
  fullName: string;
  contactInfo: string;
  professionalSummary: string;
  keyCompetencies: string[];
  experience: Array<{ jobTitle: string; company: string; duration: string; bullets: string[] }>;
  education: Array<{ course: string; institution: string }>;
  certifications?: string[];
  technicalTools?: string[];
}

interface LinkedInGuide {
  userName: string;
  headline: string;
  aboutSection: string;
  sections: Array<{ title: string; whatItIs: string; whatToPut: string; example: string; proTip?: string }>;
}

// ── PDF Download ──

export function downloadCvAsPdf(cv: CVData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkPage = (needed: number) => { if (y + needed > 270) addPage(); };

  // Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(cv.fullName || "Professional CV", pageWidth / 2, y, { align: "center" });
  y += 7;

  // Contact
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(cv.contactInfo || "", pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 5;

  // Line
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Section helper
  const sectionTitle = (title: string) => {
    checkPage(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(title.toUpperCase(), margin, y);
    y += 1;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setTextColor(0);
  };

  // Professional Summary
  sectionTitle("Professional Summary");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const summaryLines = doc.splitTextToSize(cv.professionalSummary || "", contentWidth);
  checkPage(summaryLines.length * 4);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4 + 4;

  // Key Competencies
  if (cv.keyCompetencies?.length) {
    sectionTitle("Key Competencies");
    doc.setFontSize(9);
    const skills = cv.keyCompetencies.join("  •  ");
    const skillLines = doc.splitTextToSize(skills, contentWidth);
    checkPage(skillLines.length * 4);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 4 + 4;
  }

  // Experience
  sectionTitle("Professional Experience");
  cv.experience?.forEach(exp => {
    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(exp.jobTitle || "", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(exp.duration || "", pageWidth - margin, y, { align: "right" });
    y += 4;
    doc.setFontSize(9);
    doc.text(exp.company || "", margin, y);
    doc.setTextColor(0);
    y += 5;

    exp.bullets?.forEach(bullet => {
      doc.setFontSize(9);
      const bulletText = `•  ${bullet}`;
      const lines = doc.splitTextToSize(bulletText, contentWidth - 4);
      checkPage(lines.length * 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4;
    });
    y += 3;
  });

  // Education
  if (cv.education?.length) {
    sectionTitle("Education");
    cv.education.forEach(edu => {
      checkPage(8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`•  ${edu.course} — ${edu.institution}`, margin + 2, y);
      y += 5;
    });
    y += 2;
  }

  // Certifications
  if (cv.certifications?.length) {
    sectionTitle("Certifications");
    cv.certifications.forEach(cert => {
      checkPage(6);
      doc.setFontSize(9);
      doc.text(`•  ${cert}`, margin + 2, y);
      y += 5;
    });
    y += 2;
  }

  // Technical Tools
  if (cv.technicalTools?.length) {
    sectionTitle("Technical Tools & Software");
    doc.setFontSize(9);
    const tools = cv.technicalTools.join("  •  ");
    const toolLines = doc.splitTextToSize(tools, contentWidth);
    checkPage(toolLines.length * 4);
    doc.text(toolLines, margin, y);
  }

  doc.save(`${cv.fullName?.replace(/\s+/g, "_") || "CV"}.pdf`);
}

// ── DOCX Download ──

export async function downloadCvAsDocx(cv: CVData) {
  const children: Paragraph[] = [];

  // Name
  children.push(new Paragraph({
    children: [new TextRun({ text: cv.fullName || "Professional CV", bold: true, size: 32, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  // Contact
  children.push(new Paragraph({
    children: [new TextRun({ text: cv.contactInfo || "", size: 18, color: "666666", font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
  }));

  const sectionHeading = (text: string) => new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color: "444444", font: "Calibri" })],
    spacing: { before: 300, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" } },
  });

  // Summary
  children.push(sectionHeading("Professional Summary"));
  children.push(new Paragraph({
    children: [new TextRun({ text: cv.professionalSummary || "", size: 20, font: "Calibri" })],
    spacing: { after: 200 },
  }));

  // Key Competencies
  if (cv.keyCompetencies?.length) {
    children.push(sectionHeading("Key Competencies"));
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.keyCompetencies.join("  •  "), size: 20, font: "Calibri" })],
      spacing: { after: 200 },
    }));
  }

  // Experience
  children.push(sectionHeading("Professional Experience"));
  cv.experience?.forEach(exp => {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: exp.jobTitle || "", bold: true, size: 22, font: "Calibri" }),
        new TextRun({ text: `\t${exp.duration || ""}`, size: 18, color: "888888", font: "Calibri" }),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { before: 150 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: exp.company || "", italics: true, size: 20, color: "555555", font: "Calibri" })],
      spacing: { after: 80 },
    }));
    exp.bullets?.forEach(bullet => {
      children.push(new Paragraph({
        children: [new TextRun({ text: bullet, size: 20, font: "Calibri" })],
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
    });
  });

  // Education
  if (cv.education?.length) {
    children.push(sectionHeading("Education"));
    cv.education.forEach(edu => {
      children.push(new Paragraph({
        children: [new TextRun({ text: `${edu.course} — ${edu.institution}`, size: 20, font: "Calibri" })],
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
    });
  }

  // Certifications
  if (cv.certifications?.length) {
    children.push(sectionHeading("Certifications"));
    cv.certifications.forEach(cert => {
      children.push(new Paragraph({
        children: [new TextRun({ text: cert, size: 20, font: "Calibri" })],
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
    });
  }

  // Technical Tools
  if (cv.technicalTools?.length) {
    children.push(sectionHeading("Technical Tools & Software"));
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.technicalTools.join("  •  "), size: 20, font: "Calibri" })],
    }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${cv.fullName?.replace(/\s+/g, "_") || "CV"}.docx`);
}

// ── LinkedIn Guide PDF ──

export function downloadGuideAsPdf(guide: LinkedInGuide) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => { if (y + needed > 270) { doc.addPage(); y = 20; } };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("LinkedIn Optimization Guide", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`For: ${guide.userName}`, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Headline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RECOMMENDED HEADLINE", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const headlineLines = doc.splitTextToSize(guide.headline || "", contentWidth);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 4 + 6;

  // About
  checkPage(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ABOUT SECTION", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const aboutLines = doc.splitTextToSize(guide.aboutSection || "", contentWidth);
  aboutLines.forEach((line: string) => {
    checkPage(5);
    doc.text(line, margin, y);
    y += 4;
  });
  y += 6;

  // Sections
  guide.sections?.forEach(section => {
    checkPage(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text(section.title.toUpperCase(), margin, y);
    y += 1;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setTextColor(0);

    // What it is
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("WHAT IT IS:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const whatLines = doc.splitTextToSize(section.whatItIs, contentWidth);
    whatLines.forEach((l: string) => { checkPage(5); doc.text(l, margin, y); y += 4; });
    y += 3;

    // What to put
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("WHAT TO PUT:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const putLines = doc.splitTextToSize(section.whatToPut, contentWidth);
    putLines.forEach((l: string) => { checkPage(5); doc.text(l, margin, y); y += 4; });
    y += 3;

    // Example
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("EXAMPLE:", margin, y);
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const exLines = doc.splitTextToSize(section.example, contentWidth);
    exLines.forEach((l: string) => { checkPage(5); doc.text(l, margin, y); y += 4; });
    y += 3;

    if (section.proTip) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 100, 0);
      doc.text("PRO TIP:", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0);
      const tipLines = doc.splitTextToSize(section.proTip, contentWidth);
      tipLines.forEach((l: string) => { checkPage(5); doc.text(l, margin, y); y += 4; });
    }
    y += 6;
  });

  doc.save(`LinkedIn_Guide_${guide.userName?.replace(/\s+/g, "_") || "Guide"}.pdf`);
}

// ── LinkedIn Guide DOCX ──

export async function downloadGuideAsDocx(guide: LinkedInGuide) {
  const children: Paragraph[] = [];

  children.push(new Paragraph({
    children: [new TextRun({ text: "LinkedIn Optimization Guide", bold: true, size: 32, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  children.push(new Paragraph({
    children: [new TextRun({ text: `For: ${guide.userName}`, size: 20, color: "666666", font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
  }));

  // Headline
  children.push(new Paragraph({
    children: [new TextRun({ text: "RECOMMENDED HEADLINE", bold: true, size: 22, font: "Calibri" })],
    spacing: { before: 200, after: 80 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: guide.headline || "", size: 20, font: "Calibri" })],
    spacing: { after: 200 },
  }));

  // About
  children.push(new Paragraph({
    children: [new TextRun({ text: "ABOUT SECTION", bold: true, size: 22, font: "Calibri" })],
    spacing: { before: 200, after: 80 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: guide.aboutSection || "", size: 20, font: "Calibri" })],
    spacing: { after: 300 },
  }));

  guide.sections?.forEach(section => {
    children.push(new Paragraph({
      children: [new TextRun({ text: section.title.toUpperCase(), bold: true, size: 22, color: "333333", font: "Calibri" })],
      spacing: { before: 300, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" } },
    }));

    children.push(new Paragraph({
      children: [
        new TextRun({ text: "What It Is: ", bold: true, size: 18, font: "Calibri" }),
        new TextRun({ text: section.whatItIs, size: 20, font: "Calibri" }),
      ],
      spacing: { after: 80 },
    }));

    children.push(new Paragraph({
      children: [
        new TextRun({ text: "What To Put: ", bold: true, size: 18, font: "Calibri" }),
        new TextRun({ text: section.whatToPut, size: 20, font: "Calibri" }),
      ],
      spacing: { after: 80 },
    }));

    children.push(new Paragraph({
      children: [
        new TextRun({ text: "Example: ", bold: true, size: 18, font: "Calibri" }),
        new TextRun({ text: section.example, italics: true, size: 20, font: "Calibri" }),
      ],
      spacing: { after: 80 },
    }));

    if (section.proTip) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "Pro Tip: ", bold: true, size: 18, color: "008000", font: "Calibri" }),
          new TextRun({ text: section.proTip, size: 20, font: "Calibri" }),
        ],
        spacing: { after: 100 },
      }));
    }
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `LinkedIn_Guide_${guide.userName?.replace(/\s+/g, "_") || "Guide"}.docx`);
}
