import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopPosition, TabStopType } from "docx";
import { saveAs } from "file-saver";
import type { CVData } from "@/components/cv/CVPreview";

interface LinkedInGuide {
  userName: string;
  headline: string;
  aboutSection: string;
  sections: Array<{ title: string; whatItIs: string; whatToPut: string; example: string; proTip?: string }>;
}

function contactLine(personal: CVData["personal_info"]): string {
  return [personal.email, personal.phone, personal.location, personal.linkedin]
    .filter(Boolean)
    .join("  |  ");
}

function dateRange(exp: CVData["experiences"][number]): string {
  const end = exp.isPresent ? "Present" : exp.endDate;
  return [exp.startDate, end].filter(Boolean).join(" – ");
}

function fileBaseName(personal: CVData["personal_info"]): string {
  return (personal.fullName || "CV").replace(/\s+/g, "_");
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

  const { personal_info: personal, summary, experiences, education, skills, certifications, projects } = cv;

  // Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(personal.fullName || "Professional CV", pageWidth / 2, y, { align: "center" });
  y += 6;

  if (personal.title) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(personal.title, pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0);
    y += 6;
  }

  // Contact
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(contactLine(personal), pageWidth / 2, y, { align: "center" });
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

  // Summary
  if (summary) {
    sectionTitle("Summary");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const summaryLines = doc.splitTextToSize(summary, contentWidth);
    checkPage(summaryLines.length * 4);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 4 + 4;
  }

  // Skills
  if (skills?.length) {
    sectionTitle("Skills");
    doc.setFontSize(9);
    const skillLines = doc.splitTextToSize(skills.join("  •  "), contentWidth);
    checkPage(skillLines.length * 4);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 4 + 4;
  }

  // Experience
  if (experiences?.length) {
    sectionTitle("Experience");
    experiences.forEach(exp => {
      checkPage(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(exp.jobTitle || "", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(dateRange(exp), pageWidth - margin, y, { align: "right" });
      y += 4;
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text([exp.company, exp.location].filter(Boolean).join(", "), margin, y);
      y += 5;

      exp.bullets?.forEach(bullet => {
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(`•  ${bullet}`, contentWidth - 4);
        checkPage(lines.length * 4);
        doc.text(lines, margin + 2, y);
        y += lines.length * 4;
      });
      y += 3;
    });
  }

  // Education
  if (education?.length) {
    sectionTitle("Education");
    education.forEach(edu => {
      checkPage(8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const line = [edu.degree, edu.school].filter(Boolean).join(" — ") + (edu.year ? ` (${edu.year})` : "");
      doc.text(`•  ${line}`, margin + 2, y);
      y += 5;
    });
    y += 2;
  }

  // Certifications
  if (certifications?.length) {
    sectionTitle("Certifications");
    certifications.forEach(cert => {
      checkPage(6);
      doc.setFontSize(9);
      const line = [cert.name, cert.issuer].filter(Boolean).join(" — ") + (cert.year ? ` (${cert.year})` : "");
      doc.text(`•  ${line}`, margin + 2, y);
      y += 5;
    });
    y += 2;
  }

  // Projects
  if (projects?.length) {
    sectionTitle("Projects");
    projects.forEach(proj => {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(proj.name || "", margin + 2, y);
      y += 4;
      if (proj.description) {
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(proj.description, contentWidth - 4);
        checkPage(lines.length * 4);
        doc.text(lines, margin + 2, y);
        y += lines.length * 4;
      }
      y += 2;
    });
  }

  doc.save(`${fileBaseName(personal)}.pdf`);
}

// ── DOCX Download ──

export async function downloadCvAsDocx(cv: CVData) {
  const { personal_info: personal, summary, experiences, education, skills, certifications, projects } = cv;
  const children: Paragraph[] = [];

  // Name
  children.push(new Paragraph({
    children: [new TextRun({ text: personal.fullName || "Professional CV", bold: true, size: 32, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
  }));

  if (personal.title) {
    children.push(new Paragraph({
      children: [new TextRun({ text: personal.title, size: 22, color: "444444", font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
  }

  // Contact
  children.push(new Paragraph({
    children: [new TextRun({ text: contactLine(personal), size: 18, color: "666666", font: "Calibri" })],
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
  if (summary) {
    children.push(sectionHeading("Summary"));
    children.push(new Paragraph({
      children: [new TextRun({ text: summary, size: 20, font: "Calibri" })],
      spacing: { after: 200 },
    }));
  }

  // Skills
  if (skills?.length) {
    children.push(sectionHeading("Skills"));
    children.push(new Paragraph({
      children: [new TextRun({ text: skills.join("  •  "), size: 20, font: "Calibri" })],
      spacing: { after: 200 },
    }));
  }

  // Experience
  if (experiences?.length) {
    children.push(sectionHeading("Experience"));
    experiences.forEach(exp => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.jobTitle || "", bold: true, size: 22, font: "Calibri" }),
          new TextRun({ text: `\t${dateRange(exp)}`, size: 18, color: "888888", font: "Calibri" }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 150 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: [exp.company, exp.location].filter(Boolean).join(", "), italics: true, size: 20, color: "555555", font: "Calibri" })],
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
  }

  // Education
  if (education?.length) {
    children.push(sectionHeading("Education"));
    education.forEach(edu => {
      const line = [edu.degree, edu.school].filter(Boolean).join(" — ") + (edu.year ? ` (${edu.year})` : "");
      children.push(new Paragraph({
        children: [new TextRun({ text: line, size: 20, font: "Calibri" })],
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
    });
  }

  // Certifications
  if (certifications?.length) {
    children.push(sectionHeading("Certifications"));
    certifications.forEach(cert => {
      const line = [cert.name, cert.issuer].filter(Boolean).join(" — ") + (cert.year ? ` (${cert.year})` : "");
      children.push(new Paragraph({
        children: [new TextRun({ text: line, size: 20, font: "Calibri" })],
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
    });
  }

  // Projects
  if (projects?.length) {
    children.push(sectionHeading("Projects"));
    projects.forEach(proj => {
      children.push(new Paragraph({
        children: [new TextRun({ text: proj.name || "", bold: true, size: 20, font: "Calibri" })],
        spacing: { before: 100 },
      }));
      if (proj.description) {
        children.push(new Paragraph({
          children: [new TextRun({ text: proj.description, size: 20, font: "Calibri" })],
          spacing: { after: 60 },
        }));
      }
    });
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileBaseName(personal)}.docx`);
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
