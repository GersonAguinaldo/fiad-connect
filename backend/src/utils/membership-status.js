import { AppSettings } from "../models/AppSettings.js";
import { Profile } from "../models/Profile.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { MemberStatusHistory } from "../models/MemberStatusHistory.js";
import { User } from "../models/User.js";
import { sendEmail } from "../emails/mailer.js";
import { templates } from "../emails/templates.js";

const AMBASSADOR = "Ambassadeur du Développement";

const addMonths = (d, n) => new Date(new Date(d).setMonth(new Date(d).getMonth() + n));
const addDays = (d, n) => new Date(new Date(d).getTime() + n * 86_400_000);

/** Journalise un changement de statut et notifie le membre. */
export async function changeMemberStatus(profile, newStatus, { reason, changedBy, automatic = false } = {}) {
  const oldStatus = profile.status;
  if (oldStatus === newStatus) return profile;
  profile.status = newStatus;
  await profile.save();
  await MemberStatusHistory.create({
    profile: profile._id,
    user: profile.user,
    oldStatus,
    newStatus,
    reason,
    changedBy,
    automatic,
  });
  await Notification.create({
    user: profile.user,
    kind: "statut",
    title: "Votre statut a été mis à jour",
    body: `Votre statut de membre est passé de « ${oldStatus ?? "—"} » à « ${newStatus} ».${reason ? ` Motif : ${reason}` : ""}`,
    link: "/mon-profil",
  });
  const user = await User.findById(profile.user).lean();
  if (user?.email) {
    void sendEmail({
      to: user.email,
      ...templates.statusChange({ oldStatus, newStatus, reason }),
      meta: { profileId: profile._id },
    });
  }
  return profile;
}

/** Regle quotidienne : desactive les ambassadeurs impayes, relance avant echeance. */
export async function applyMembershipStatusRules() {
  const settings = await AppSettings.findOneAndUpdate(
    { key: "singleton" },
    { $setOnInsert: { key: "singleton" } },
    { new: true, upsert: true },
  );
  if (!settings.autoStatusEnabled) return { deactivated: 0, reminded: 0 };

  const profiles = await Profile.find({ category: AMBASSADOR });
  let deactivated = 0;
  let reminded = 0;
  const now = new Date();

  for (const profile of profiles) {
    const lastPaid = await Transaction.findOne({
      user: profile.user,
      status: { $in: ["paid", "Réussi", "Payé"] },
      reason: /^cotisation/i,
    })
      .sort({ createdAt: -1 })
      .lean();

    const base = lastPaid?.createdAt ?? profile.createdAt;
    const dueAt = addMonths(base, settings.duesPeriodMonths);

    if (profile.status === "Actif" && now > addDays(dueAt, settings.gracePeriodDays)) {
      await changeMemberStatus(profile, "Inactif", {
        reason: "Cotisation impayée au-delà du délai de grâce",
        automatic: true,
      });
      deactivated += 1;
    } else if (
      profile.status === "Actif" &&
      now >= addDays(dueAt, -settings.reminderDaysBefore) &&
      now <= addDays(dueAt, settings.gracePeriodDays)
    ) {
      const recent = await Notification.findOne({
        user: profile.user,
        kind: "relance",
        createdAt: { $gt: addDays(now, -7) },
      }).lean();
      if (!recent) {
        await Notification.create({
          user: profile.user,
          kind: "relance",
          title: "Renouvellement de votre cotisation",
          body: `Votre cotisation d'ambassadeur arrive à échéance le ${dueAt.toLocaleDateString("fr-FR")}. Renouvelez-la pour conserver un statut actif.`,
          link: "/mes-finances",
        });
        const user = await User.findById(profile.user).lean();
        if (user?.email) {
          void sendEmail({
            to: user.email,
            ...templates.duesReminder({
              dueAt,
              amount: settings.ambassadorFeeAmount,
              currency: settings.ambassadorFeeCurrency,
            }),
            meta: { profileId: profile._id },
          });
        }
        reminded += 1;
      }
    }
  }

  settings.lastStatusRunAt = now;
  await settings.save();
  return { deactivated, reminded };
}

/** Planifie l'execution quotidienne (toutes les 24 h apres le demarrage). */
export function scheduleMembershipStatusRules() {
  const run = () => applyMembershipStatusRules().catch((e) => console.error("status rules", e));
  setTimeout(run, 30_000);
  setInterval(run, 24 * 60 * 60 * 1000);
}