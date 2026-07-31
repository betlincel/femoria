"use client";

import { useActionState } from "react";
import type { z } from "zod";
import { updateProfile, type ProfileFormState } from "@/app/[locale]/account/actions";
import type { profileSchema } from "@/lib/auth";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

type Profile = z.infer<typeof profileSchema>;
const initialState: ProfileFormState = { status: "idle" };

export function ProfileForm({
  profile,
  locale,
  messages: m,
}: {
  profile: Profile;
  locale: Locale;
  messages: Messages;
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form className="profile-form" action={action}>
      <div>
        <p className="eyebrow">{m.profileEyebrow}</p>
        <h2>{m.profileTitle}</h2>
        <p>{m.profileText}</p>
      </div>
      <input type="hidden" name="locale" value={locale} />
      <label>{m.fullName}
        <input name="displayName" type="text" defaultValue={profile.display_name} minLength={2} maxLength={120} required autoComplete="name" />
      </label>
      <div className="profile-fields">
        <label>{m.city}
          <input name="city" type="text" defaultValue={profile.city ?? ""} maxLength={80} autoComplete="address-level1" />
        </label>
        <label>{m.district}
          <input name="district" type="text" defaultValue={profile.district ?? ""} maxLength={80} autoComplete="address-level2" />
        </label>
      </div>
      <label>{m.profileLanguage}
        <select name="profileLocale" defaultValue={profile.locale}>
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
        </select>
      </label>
      {state.status === "saved" ? <p className="form-success" role="status">{m.profileSaved}</p> : null}
      {state.status === "invalid" ? <p className="form-error" role="alert">{m.profileValidation}</p> : null}
      {state.status === "error" ? <p className="form-error" role="alert">{m.profileSaveFailed}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? m.profileSaving : m.profileSave}
      </button>
    </form>
  );
}
