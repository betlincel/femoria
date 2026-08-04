import { z } from "zod";
import { producerApplicationRowSchema } from "@/lib/producer-application";
import { requireUser } from "@/lib/supabase/auth";
import type { Locale } from "@/lib/types";
import { ProducerApplicationForm } from "./ProducerApplicationForm";
import { ProducerApplicationStatusCard } from "./ProducerApplicationStatusCard";

const applicationProfileSchema = z.object({
  role: z.enum(["buyer", "producer", "admin"]),
  status: z.enum(["active", "suspended"]),
  city: z.string().nullable(),
  district: z.string().nullable(),
});

export async function ProducerApplicationSection({ locale }: { locale: Locale }) {
  const returnTo = `/${locale}/info/producer-application`;
  const { supabase, user } = await requireUser(locale, returnTo);
  const [profileResult, applicationResult] = await Promise.all([
    supabase.from("profiles").select("role, status, city, district").eq("id", user.id).maybeSingle(),
    supabase
      .from("producer_profiles")
      .select("profile_id, verification_status, approved_at, created_at, updated_at")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);
  const profile = applicationProfileSchema.safeParse(profileResult.data);
  if (profileResult.error || !profile.success || profile.data.status !== "active" || applicationResult.error) {
    return <ProducerApplicationStatusCard locale={locale} status="unavailable" profileRole="buyer" />;
  }

  if (applicationResult.data) {
    const application = producerApplicationRowSchema.safeParse(applicationResult.data);
    if (!application.success) {
      return <ProducerApplicationStatusCard locale={locale} status="unavailable" profileRole={profile.data.role} />;
    }
    return (
      <ProducerApplicationStatusCard
        locale={locale}
        status={application.data.verification_status}
        profileRole={profile.data.role}
      />
    );
  }

  return (
    <ProducerApplicationForm
      locale={locale}
      initialCity={profile.data.city ?? ""}
      initialDistrict={profile.data.district ?? ""}
      profileRole={profile.data.role}
    />
  );
}
