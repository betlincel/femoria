"use client";

import { useActionState } from "react";
import { submitProducerApplication } from "@/app/[locale]/info/[slug]/producer-application-actions";
import { producerApplicationUi } from "@/lib/i18n";
import { initialProducerApplicationState } from "@/lib/producer-application";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";
import { ProducerApplicationStatusCard } from "./ProducerApplicationStatusCard";

export function ProducerApplicationForm({
  locale,
  initialCity,
  initialDistrict,
  profileRole,
}: {
  locale: Locale;
  initialCity: string;
  initialDistrict: string;
  profileRole: "buyer" | "producer" | "admin";
}) {
  const [state, action, pending] = useActionState(submitProducerApplication, initialProducerApplicationState);
  const ui = producerApplicationUi[locale];

  if (state.status === "success") {
    return <ProducerApplicationStatusCard locale={locale} status="success" profileRole={profileRole} />;
  }

  const feedback = state.status === "invalid"
    ? ui.invalid
    : state.status === "duplicate"
      ? ui.duplicate
      : state.status === "error"
        ? ui.error
        : null;

  return (
    <form className="producer-application-form" action={action} aria-describedby={feedback ? "producer-application-feedback" : undefined}>
      <header className="producer-application-form-header">
        <p className="eyebrow">{ui.formEyebrow}</p>
        <h2>{ui.formTitle}</h2>
        <p>{ui.formIntro}</p>
      </header>
      <input type="hidden" name="locale" value={locale} />

      <fieldset className="producer-application-step">
        <legend>{ui.sectionProduction}</legend>
        <div className="producer-application-grid">
          <label htmlFor="productionArea">
            <span>{ui.productionArea}</span>
            <small>{ui.productionAreaHint}</small>
            <select id="productionArea" name="productionArea" defaultValue="" required>
              <option value="" disabled>—</option>
              {Object.entries(ui.productionOptions).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor="madeToOrder">
            <span>{ui.madeToOrder}</span>
            <select id="madeToOrder" name="madeToOrder" defaultValue="" required>
              <option value="" disabled>—</option>
              {Object.entries(ui.madeToOrderOptions).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <label htmlFor="productTypes">
          <span>{ui.productTypes}</span>
          <textarea id="productTypes" name="productTypes" placeholder={ui.productTypesPlaceholder} minLength={2} maxLength={500} rows={3} required />
        </label>
        <label htmlFor="productionMethod">
          <span>{ui.productionMethod}</span>
          <textarea id="productionMethod" name="productionMethod" placeholder={ui.productionMethodPlaceholder} minLength={10} maxLength={800} rows={4} required />
        </label>
      </fieldset>

      <fieldset className="producer-application-step">
        <legend>{ui.sectionStory}</legend>
        <label htmlFor="storyTr">
          <span>{ui.storyTr}</span>
          <small>{ui.storyTrHint}</small>
          <textarea id="storyTr" name="storyTr" minLength={40} maxLength={2000} rows={7} required />
        </label>
        <label htmlFor="storyEn">
          <span>{ui.storyEn}</span>
          <textarea id="storyEn" name="storyEn" maxLength={2000} rows={5} />
        </label>
      </fieldset>

      <fieldset className="producer-application-step">
        <legend>{ui.sectionRegion}</legend>
        <div className="producer-application-grid">
          <label htmlFor="applicationCity"><span>{ui.city}</span><input id="applicationCity" name="city" defaultValue={initialCity} minLength={2} maxLength={80} autoComplete="address-level1" required /></label>
          <label htmlFor="applicationDistrict"><span>{ui.district}</span><input id="applicationDistrict" name="district" defaultValue={initialDistrict} minLength={2} maxLength={80} autoComplete="address-level2" required /></label>
        </div>
        <label htmlFor="approximateArea">
          <span>{ui.approximateArea}</span>
          <small>{ui.approximateAreaHint}</small>
          <input id="approximateArea" name="approximateArea" minLength={2} maxLength={160} autoComplete="off" required />
        </label>
        <fieldset className="producer-application-options">
          <legend>{ui.deliveryRegions}</legend>
          {Object.entries(ui.deliveryOptions).map(([value, label]) => (
            <label key={value}><input type="checkbox" name="deliveryRegions" value={value} /><span>{label}</span></label>
          ))}
        </fieldset>
      </fieldset>

      <fieldset className="producer-application-step producer-application-consent">
        <legend>{ui.sectionConsent}</legend>
        <label className="producer-application-check">
          <input type="checkbox" name="consent" required />
          <span>{ui.consent}</span>
        </label>
        <p className="form-privacy"><Icon name="shield" size={17} />{ui.privacy}</p>
      </fieldset>

      {feedback ? <p id="producer-application-feedback" className="form-error" role="alert">{feedback}</p> : null}
      <button className="btn btn-primary producer-application-submit" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? ui.submitting : state.status === "error" ? ui.retry : ui.submit}<Icon name="arrow" size={18} />
      </button>
    </form>
  );
}
