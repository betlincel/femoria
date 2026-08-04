import type { LocalizedText } from "../types";

export type EditorialStatus = "editorial" | "available" | "planned";

export interface ContentImage {
  src: string;
  alt: LocalizedText;
}

export interface ContentLink {
  href: string;
  label: LocalizedText;
}

export interface ContentSection {
  id: string;
  eyebrow?: LocalizedText;
  title: LocalizedText;
  paragraphs: Record<"tr" | "en", string[]>;
  bullets?: Record<"tr" | "en", string[]>;
  callout?: LocalizedText;
  image?: ContentImage;
}

export interface InfoPageContent {
  slug: string;
  status: EditorialStatus;
  eyebrow: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  intro: LocalizedText;
  image?: ContentImage;
  sections: ContentSection[];
  links?: ContentLink[];
}

export interface GuideSection {
  id: string;
  title: LocalizedText;
  paragraphs: Record<"tr" | "en", string[]>;
  bullets?: Record<"tr" | "en", string[]>;
}

export interface GuideArticle {
  slug: string;
  status: "editorial";
  title: LocalizedText;
  summary: LocalizedText;
  cover: ContentImage;
  readingMinutes: number;
  category: LocalizedText;
  editorialLabel: LocalizedText;
  intro: LocalizedText;
  sections: GuideSection[];
  conclusion: LocalizedText;
  relatedSlugs: string[];
  note?: LocalizedText;
}

export type FaqCategory =
  | "account"
  | "producer"
  | "catalog"
  | "delivery"
  | "privacy"
  | "assistant";

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: LocalizedText;
  answer: LocalizedText;
}

export interface StepContent {
  title: LocalizedText;
  text: LocalizedText;
  status: "available" | "planned";
}

