/**
 * Migration des donnees Supabase -> MongoDB.
 *
 * Pre-requis (a mettre dans backend/.env) :
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=sb_service_role_...
 *   MONGODB_URI=mongodb://127.0.0.1:27017/lapadi
 *
 * Lancer :  npm run migrate:from-supabase
 *
 * Ce script est idempotent : il fait un upsert sur l'email pour les users/profiles
 * et reinjecte les events/formations/transactions/settings. Les mots de passe
 * ne peuvent pas etre exportes depuis auth.users ; les users importes auront
 * un passwordHash placeholder ("imported") et devront passer par "Mot de passe
 * oublie" (ou un reset cote admin) pour se reconnecter.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Profile } from "../models/Profile.js";
import { Event, EventRegistration } from "../models/Event.js";
import { EventResource } from "../models/EventResource.js";
import { Formation, FormationEnrollment } from "../models/Formation.js";
import { Transaction } from "../models/Transaction.js";
import { AppSettings } from "../models/AppSettings.js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans backend/.env");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAll(table) {
  const out = [];
  let from = 0;
  const size = 1000;
  for (;;) {
    const { data, error } = await sb.from(table).select("*").range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
    from += size;
  }
  return out;
}

function mapProfile(p) {
  return {
    firstName: p.first_name,
    lastName: p.last_name,
    phone: p.phone,
    phoneCountry: p.phone_country,
    sex: p.sex,
    birthDate: p.birth_date ? new Date(p.birth_date) : undefined,
    birthPlace: p.birth_place,
    country: p.country,
    city: p.city,
    address: p.address,
    category: p.category ?? "membre",
    membershipType: p.membership_type ?? "standard",
    status: p.status ?? "actif",
    avatarUrl: p.avatar_url,
  };
}

async function run() {
  await connectDB();

  // --- Users + roles ---
  console.log("→ profiles + user_roles");
  const [profiles, roles] = await Promise.all([fetchAll("profiles"), fetchAll("user_roles")]);
  const rolesByUser = new Map();
  for (const r of roles) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }
  const userIdMap = new Map(); // supabase uuid -> mongo _id
  for (const p of profiles) {
    if (!p.email) continue;
    const userRoles = rolesByUser.get(p.id) ?? ["membre"];
    const user = await User.findOneAndUpdate(
      { email: p.email.toLowerCase() },
      {
        $setOnInsert: { email: p.email.toLowerCase(), passwordHash: "imported" },
        $set: { roles: userRoles },
      },
      { upsert: true, new: true },
    );
    userIdMap.set(p.id, user._id);
    await Profile.findOneAndUpdate(
      { user: user._id },
      { $set: { ...mapProfile(p), user: user._id } },
      { upsert: true, new: true },
    );
  }
  console.log(`  ${userIdMap.size} users/profiles importes`);

  // --- Events ---
  console.log("→ events");
  const events = await fetchAll("events");
  const eventIdMap = new Map();
  for (const e of events) {
    const doc = await Event.create({
      title: e.title,
      description: e.description,
      type: e.type,
      startsAt: e.starts_at ? new Date(e.starts_at) : undefined,
      endsAt: e.ends_at ? new Date(e.ends_at) : undefined,
      location: e.location,
      price: e.price ?? 0,
      currency: e.currency ?? "XOF",
      targetCategories: e.target_categories ?? [],
      targetCities: e.target_cities ?? [],
      targetCountries: e.target_countries ?? [],
      coverUrl: e.cover_url,
      createdBy: userIdMap.get(e.created_by),
    });
    eventIdMap.set(e.id, doc._id);
  }
  console.log(`  ${eventIdMap.size} events importes`);

  // --- Event registrations ---
  console.log("→ event_registrations");
  const regs = await fetchAll("event_registrations");
  let regCount = 0;
  for (const r of regs) {
    const ev = eventIdMap.get(r.event_id);
    const us = userIdMap.get(r.user_id);
    if (!ev || !us) continue;
    await EventRegistration.findOneAndUpdate(
      { event: ev, user: us },
      { $set: { event: ev, user: us, status: r.status ?? "inscrit" } },
      { upsert: true },
    );
    regCount++;
  }
  console.log(`  ${regCount} inscriptions evenements`);

  // --- Event resources ---
  console.log("→ event_resources");
  const ress = await fetchAll("event_resources");
  let resCount = 0;
  for (const r of ress) {
    const ev = eventIdMap.get(r.event_id);
    if (!ev) continue;
    await EventResource.create({
      event: ev,
      title: r.title,
      description: r.description,
      fileUrl: r.file_url,
      fileName: r.file_name,
      fileType: r.file_type,
      fileSize: r.file_size,
      uploadedBy: userIdMap.get(r.uploaded_by),
    });
    resCount++;
  }
  console.log(`  ${resCount} ressources`);

  // --- Formations ---
  console.log("→ formations");
  const formations = await fetchAll("formations");
  const formationIdMap = new Map();
  for (const f of formations) {
    const doc = await Formation.create({
      title: f.title,
      description: f.description,
      trainer: f.trainer,
      startsAt: f.starts_at ? new Date(f.starts_at) : undefined,
      endsAt: f.ends_at ? new Date(f.ends_at) : undefined,
      resourceUrl: f.resource_url,
      price: f.price ?? 0,
    });
    formationIdMap.set(f.id, doc._id);
  }
  console.log(`  ${formationIdMap.size} formations`);

  console.log("→ formation_enrollments");
  const enrolls = await fetchAll("formation_enrollments");
  let enrCount = 0;
  for (const r of enrolls) {
    const f = formationIdMap.get(r.formation_id);
    const u = userIdMap.get(r.user_id);
    if (!f || !u) continue;
    await FormationEnrollment.findOneAndUpdate(
      { formation: f, user: u },
      { $set: { formation: f, user: u, status: r.status ?? "inscrit" } },
      { upsert: true },
    );
    enrCount++;
  }
  console.log(`  ${enrCount} inscriptions formations`);

  // --- Transactions ---
  console.log("→ transactions");
  const txs = await fetchAll("transactions");
  let txCount = 0;
  for (const t of txs) {
    const u = userIdMap.get(t.user_id);
    if (!u) continue;
    await Transaction.create({
      user: u,
      amount: t.amount,
      currency: t.currency ?? "XOF",
      reason: t.reason,
      status: t.status ?? "pending",
      provider: t.provider,
      providerRef: t.provider_ref,
      metadata: t.metadata,
    });
    txCount++;
  }
  console.log(`  ${txCount} transactions`);

  // --- AppSettings ---
  console.log("→ app_settings");
  const settings = await fetchAll("app_settings");
  const s = settings[0];
  if (s) {
    await AppSettings.findOneAndUpdate(
      { key: "singleton" },
      {
        $set: {
          key: "singleton",
          ambassadorFeeAmount: s.ambassador_fee_amount ?? 25000,
          ambassadorFeeCurrency: s.ambassador_fee_currency ?? "XOF",
        },
      },
      { upsert: true },
    );
    console.log("  settings importes");
  }

  console.log("\n✅ Migration terminee. Les users importes ont passwordHash='imported'");
  console.log("   → demande-leur de passer par 'Mot de passe oublie' a la 1ere connexion.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});