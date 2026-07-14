import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Genere un certificat PDF simple pour (user, formation).
 * Retourne { fileUrl, code, absolutePath }.
 */
export async function generateCertificatePdf({ user, profile, formation, uploadDir }) {
  const certDir = path.join(uploadDir, "certificates");
  fs.mkdirSync(certDir, { recursive: true });

  const code = `FIAD-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const filename = `${code}.pdf`;
  const absolutePath = path.join(certDir, filename);

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || user.email;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
    const stream = fs.createWriteStream(absolutePath);
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.pipe(stream);

    // Cadre
    doc.lineWidth(3).strokeColor("#0f766e").rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke();
    doc.lineWidth(1).strokeColor("#0f766e").rect(40, 40, doc.page.width - 80, doc.page.height - 80).stroke();

    doc.fillColor("#0f766e").fontSize(14).text("FIAD-Monde", 0, 80, { align: "center" });
    doc.fillColor("#111").fontSize(36).text("Certificat de reussite", 0, 130, { align: "center" });

    doc.moveDown(2).fontSize(14).fillColor("#333").text("Le present certificat est decerne a", { align: "center" });

    doc.moveDown(0.5).fontSize(28).fillColor("#0f172a").text(fullName, { align: "center" });

    doc.moveDown(0.8).fontSize(14).fillColor("#333").text("pour avoir suivi et complete la formation", { align: "center" });

    doc.moveDown(0.4).fontSize(22).fillColor("#0f766e").text(formation.title, { align: "center" });

    const issued = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
    doc.moveDown(2).fontSize(12).fillColor("#333").text(`Delivre le ${issued}`, { align: "center" });
    doc.moveDown(0.3).fontSize(10).fillColor("#666").text(`Code de verification : ${code}`, { align: "center" });

    doc.end();
  });

  return { code, fileUrl: `/uploads/certificates/${filename}`, absolutePath };
}