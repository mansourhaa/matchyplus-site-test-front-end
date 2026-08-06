export type LegalSection = { title: string; content: string };

export type LegalDocument = {
  pageTitle: string;
  heading: string;
  subheading: string;
  sections: LegalSection[];
  footer: string;
};
