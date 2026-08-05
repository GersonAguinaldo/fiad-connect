/** Gabarits HTML transactionnels aux couleurs La PaDI (bleu #046bd2, Montserrat). */

const BRAND = "#046bd2";

const money = (a, c = "XOF") =>
  `${Number(a ?? 0).toLocaleString("fr-FR")} ${c}`;

const date = (d) => new Date(d ?? Date.now()).toLocaleDateString("fr-FR");

function layout({ title, intro, bodyHtml = "", ctaLabel, ctaUrl }) {
  const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  const url = ctaUrl?.startsWith("http") ? ctaUrl : `${appUrl}${ctaUrl ?? ""}`;
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f4f7fb;font-family:Montserrat,Segoe UI,Arial,sans-serif;color:#1b2430">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3eaf3">
    <tr><td style="background:${BRAND};padding:24px 28px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.3px">La PaDI</td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND}">${title}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${intro}</p>
      ${bodyHtml}
      ${
        ctaLabel && url
          ? `<p style="margin:24px 0 0"><a href="${url}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${ctaLabel}</a></p>`
          : ""
      }
    </td></tr>
    <tr><td style="padding:18px 28px;background:#f8fafd;color:#6b7c93;font-size:12px;line-height:1.5">
      La Panafricaine du Développement Intégral — cet email vous est envoyé suite à une action sur votre espace membre.
    </td></tr>
  </table></body></html>`;
}

function rows(pairs) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;border-collapse:collapse">
    ${pairs
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 0;color:#6b7c93;border-bottom:1px solid #eef2f7">${k}</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #eef2f7">${v}</td></tr>`,
      )
      .join("")}
  </table>`;
}

export const templates = {
  welcome: (p) => ({
    kind: "bienvenue",
    subject: "Bienvenue à La PaDI",
    html: layout({
      title: `Bienvenue ${p.firstName ?? ""}`.trim(),
      intro:
        "Votre compte membre a bien été créé. Vous pouvez dès à présent accéder à votre espace, consulter les formations, les événements et suivre vos cotisations.",
      bodyHtml: rows([
        ["Email", p.email],
        ["Catégorie", p.category],
        ["Inscription", date(p.createdAt)],
      ]),
      ctaLabel: "Accéder à mon espace",
      ctaUrl: "/mon-espace",
    }),
  }),

  receipt: (p) => ({
    kind: "recu",
    subject: `Reçu de paiement — ${p.reason ?? "Cotisation"}`,
    html: layout({
      title: "Paiement confirmé",
      intro: "Nous accusons réception de votre paiement. Voici votre reçu.",
      bodyHtml: rows([
        ["Motif", p.reason],
        ["Montant", money(p.amount, p.currency)],
        ["Référence", p.reference],
        ["Date", date(p.occurredAt)],
        ["Statut", "Réussi"],
      ]),
      ctaLabel: "Voir mes finances",
      ctaUrl: "/mes-finances",
    }),
  }),

  statusChange: (p) => ({
    kind: "statut",
    subject: "Votre statut de membre a été mis à jour",
    html: layout({
      title: "Mise à jour de votre statut",
      intro: `Votre statut est passé de « ${p.oldStatus ?? "—"} » à « ${p.newStatus} ».`,
      bodyHtml: rows([
        ["Nouveau statut", p.newStatus],
        ["Motif", p.reason],
        ["Date", date()],
      ]),
      ctaLabel: "Consulter mon profil",
      ctaUrl: "/mon-profil",
    }),
  }),

  duesReminder: (p) => ({
    kind: "relance",
    subject: "Renouvellement de votre cotisation",
    html: layout({
      title: "Votre cotisation arrive à échéance",
      intro: `Pour conserver un statut actif et l'accès à vos avantages, pensez à renouveler votre cotisation avant le ${date(p.dueAt)}.`,
      bodyHtml: rows([
        ["Échéance", date(p.dueAt)],
        ["Montant", p.amount ? money(p.amount, p.currency) : undefined],
      ]),
      ctaLabel: "Renouveler ma cotisation",
      ctaUrl: "/mes-finances",
    }),
  }),

  test: () => ({
    kind: "test",
    subject: "Test d'envoi — La PaDI",
    html: layout({
      title: "Configuration SMTP opérationnelle",
      intro: "Si vous lisez cet email, votre serveur d'envoi local est correctement configuré.",
    }),
  }),
};
