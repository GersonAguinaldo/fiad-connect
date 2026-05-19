export type Member = {
  id: string;
  name: string;
  email: string;
  city: string;
  country: string;
  category: "Ordinaire" | "Liberté financière" | "Ambassadeur" | "Sympathisant";
  status: "Actif" | "En attente" | "Suspendu";
  joined: string;
  ytdSpending: string;
  owner: string;
};

export const MEMBERS: Member[] = [
  { id: "M-1042", name: "Aïcha Kone", email: "aicha.kone@example.com", city: "Abidjan", country: "Côte d'Ivoire", category: "Ambassadeur", status: "Actif", joined: "12/03/2024", ytdSpending: "180 000 FCFA", owner: "E. Watson" },
  { id: "M-1043", name: "Jean-Baptiste Mendy", email: "jb.mendy@example.com", city: "Dakar", country: "Sénégal", category: "Liberté financière", status: "Actif", joined: "04/04/2024", ytdSpending: "320 000 FCFA", owner: "L. Adodo" },
  { id: "M-1044", name: "Esther N'Guessan", email: "esther.n@example.com", city: "Yamoussoukro", country: "Côte d'Ivoire", category: "Ordinaire", status: "Actif", joined: "21/04/2024", ytdSpending: "65 000 FCFA", owner: "E. Watson" },
  { id: "M-1045", name: "Paul Adégbola", email: "paul.adegbola@example.com", city: "Cotonou", country: "Bénin", category: "Ambassadeur", status: "En attente", joined: "01/05/2024", ytdSpending: "—", owner: "L. Adodo" },
  { id: "M-1046", name: "Marie-Claire Yao", email: "mc.yao@example.com", city: "Lomé", country: "Togo", category: "Ordinaire", status: "Actif", joined: "10/05/2024", ytdSpending: "120 000 FCFA", owner: "S. Baker" },
  { id: "M-1047", name: "Samuel Ouédraogo", email: "samuel.o@example.com", city: "Ouagadougou", country: "Burkina Faso", category: "Sympathisant", status: "Actif", joined: "18/05/2024", ytdSpending: "—", owner: "S. Baker" },
  { id: "M-1048", name: "Fatou Diallo", email: "fatou.diallo@example.com", city: "Bamako", country: "Mali", category: "Liberté financière", status: "Actif", joined: "02/06/2024", ytdSpending: "245 000 FCFA", owner: "L. Adodo" },
  { id: "M-1049", name: "Christian Effa", email: "c.effa@example.com", city: "Yaoundé", country: "Cameroun", category: "Ambassadeur", status: "Actif", joined: "11/06/2024", ytdSpending: "410 000 FCFA", owner: "E. Watson" },
  { id: "M-1050", name: "Awa Sow", email: "awa.sow@example.com", city: "Conakry", country: "Guinée", category: "Ordinaire", status: "Suspendu", joined: "20/06/2024", ytdSpending: "30 000 FCFA", owner: "S. Baker" },
  { id: "M-1051", name: "David Tetteh", email: "david.t@example.com", city: "Accra", country: "Ghana", category: "Ambassadeur", status: "Actif", joined: "30/06/2024", ytdSpending: "275 000 FCFA", owner: "L. Adodo" },
];

export const FORMATIONS = [
  { id: "F1", title: "Crédo des Ambassadeurs — Module 1", instructor: "M. LAWSON L.A.", schedule: "Lundi 19h00 GMT", attendees: 248, status: "En cours" },
  { id: "F2", title: "Liberté financière : fondations", instructor: "Dr. K. Mensah", schedule: "Mercredi 18h30 GMT", attendees: 162, status: "En cours" },
  { id: "F3", title: "Coaching de vie & leadership", instructor: "Mme. A. Coulibaly", schedule: "Vendredi 20h00 GMT", attendees: 95, status: "Inscriptions ouvertes" },
  { id: "F4", title: "Entrepreneuriat panafricain", instructor: "M. C. Effa", schedule: "Samedi 16h00 GMT", attendees: 134, status: "En cours" },
];

export const EVENTS = [
  { id: "E1", title: "Sommet Mondial du Coaching", date: "2026-09-18", location: "Lomé, Togo", type: "Sommet", registrations: 480 },
  { id: "E2", title: "Clinique de santé communautaire", date: "2026-06-05", location: "Cotonou, Bénin", type: "Clinique", registrations: 92 },
  { id: "E3", title: "Webinaire — Crédo des Ambassadeurs", date: "2026-05-29", location: "En ligne", type: "Webinaire", registrations: 312 },
  { id: "E4", title: "Sortie touristique — Parc W", date: "2026-07-12", location: "Niger", type: "Sortie", registrations: 38 },
];

export const TRANSACTIONS = [
  { id: "T-9081", member: "Aïcha Kone", reason: "Cotisation annuelle", amount: "60 000 FCFA", method: "Mobile Money", date: "12/05/2026", status: "Réussi" as const },
  { id: "T-9082", member: "Jean-Baptiste Mendy", reason: "Frais formation", amount: "25 000 FCFA", method: "Carte", date: "12/05/2026", status: "Réussi" as const },
  { id: "T-9083", member: "Paul Adégbola", reason: "Adhésion", amount: "15 000 FCFA", method: "Virement", date: "11/05/2026", status: "En attente" as const },
  { id: "T-9084", member: "Fatou Diallo", reason: "Cotisation annuelle", amount: "60 000 FCFA", method: "Mobile Money", date: "10/05/2026", status: "Réussi" as const },
  { id: "T-9085", member: "Awa Sow", reason: "Cotisation annuelle", amount: "60 000 FCFA", method: "Carte", date: "09/05/2026", status: "Échoué" as const },
];