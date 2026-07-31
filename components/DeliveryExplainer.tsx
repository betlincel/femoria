import type { Messages } from "@/lib/i18n";
import { Icon } from "./Icons";
import { SectionHeader } from "./SectionHeader";

export function DeliveryExplainer({ messages: m }: { messages: Messages }) {
  return (
    <section className="section delivery-section">
      <div className="container">
        <SectionHeader
          eyebrow={m.deliveryEyebrow}
          title={m.deliveryTitle}
          text={m.deliveryText}
        />
        <div className="delivery-grid">
          <article className="delivery-card">
            <span className="delivery-icon"><Icon name="bag" size={24} /></span>
            <div>
              <p className="delivery-step">01</p>
              <h3>{m.pickupTitle}</h3>
              <p>{m.pickupText}</p>
            </div>
          </article>
          <article className="delivery-card">
            <span className="delivery-icon sage"><Icon name="home" size={24} /></span>
            <div>
              <p className="delivery-step">02</p>
              <h3>{m.homeDeliveryTitle}</h3>
              <p>{m.homeDeliveryText}</p>
            </div>
          </article>
        </div>
        <p className="privacy-ribbon"><Icon name="shield" />{m.deliveryPrivacy}</p>
      </div>
    </section>
  );
}
