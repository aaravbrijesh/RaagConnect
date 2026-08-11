export interface KnowledgeForm {
  value: string;
  label: string;
}

export interface KnowledgeInstrument {
  value: string;
  label: string;
  forms: KnowledgeForm[];
}

export const INSTRUMENTS: KnowledgeInstrument[] = [
  {
    value: "vocal",
    label: "Vocal (Gayaki)",
    forms: [
      { value: "vocal-dhrupad-dhamaar", label: "Dhrupad/Dhamaar" },
      { value: "vocal-chota-bada-khayal", label: "Chota/Bada Khayal" },
      { value: "vocal-thumri-dadra", label: "Thumri/Dadra" },
      { value: "vocal-tarana", label: "Tarana" },
      { value: "vocal-tappa", label: "Tappa" },
      { value: "vocal-bhajan-abhang", label: "Bhajan/Abhang" },
      { value: "vocal-other", label: "Other (Vocal)" },
    ],
  },
  {
    value: "tabla",
    label: "Tabla",
    forms: [
      { value: "tabla-peshkar", label: "Peshkar" },
      { value: "tabla-kayada-rela", label: "Kayada/Rela" },
      { value: "tabla-gat-tukda-paran", label: "Gat/Tukda/Paran" },
      { value: "tabla-chakradar-tihai", label: "Chakradar/Tihai" },
      { value: "tabla-theka-laggi", label: "Theka/Laggi" },
      { value: "tabla-other", label: "Other (Tabla)" },
    ],
  },
  {
    value: "sitar",
    label: "Sitar",
    forms: [
      { value: "sitar-alap-jhod-jhala", label: "Alap/Jhod/Jhala" },
      { value: "sitar-maseetkhani-gat", label: "Maseetkhani (Vilambit) Gat" },
      { value: "sitar-razakhani-gat", label: "Razakhani (Drut) Gat" },
      { value: "sitar-toda-taan", label: "Todas/Taans" },
      { value: "sitar-other", label: "Other (Sitar)" },
    ],
  },
  {
    value: "sarod",
    label: "Sarod",
    forms: [
      { value: "sarod-alap-jhod-jhala", label: "Alap/Jhod/Jhala" },
      { value: "sarod-vilambit-gat", label: "Vilambit Gat" },
      { value: "sarod-drut-gat", label: "Drut Gat" },
      { value: "sarod-toda-taan", label: "Todas/Taans" },
      { value: "sarod-other", label: "Other (Sarod)" },
    ],
  },
  {
    value: "bansuri",
    label: "Bansuri",
    forms: [
      { value: "bansuri-alap-jhod-jhala", label: "Alap/Jhod/Jhala" },
      { value: "bansuri-vilambit-gat", label: "Vilambit Gat" },
      { value: "bansuri-drut-gat", label: "Drut Gat" },
      { value: "bansuri-dhun", label: "Dhun" },
      { value: "bansuri-other", label: "Other (Bansuri)" },
    ],
  },
  {
    value: "sarangi",
    label: "Sarangi",
    forms: [
      { value: "sarangi-alap", label: "Alap" },
      { value: "sarangi-gat", label: "Gat" },
      { value: "sarangi-thumri-sangat", label: "Thumri/Vocal Sangat" },
      { value: "sarangi-other", label: "Other (Sarangi)" },
    ],
  },
  {
    value: "santoor",
    label: "Santoor",
    forms: [
      { value: "santoor-alap-jhod-jhala", label: "Alap/Jhod/Jhala" },
      { value: "santoor-gat", label: "Gat" },
      { value: "santoor-dhun", label: "Dhun" },
      { value: "santoor-other", label: "Other (Santoor)" },
    ],
  },
  {
    value: "violin",
    label: "Violin",
    forms: [
      { value: "violin-alap-jhod-jhala", label: "Alap/Jhod/Jhala" },
      { value: "violin-gat", label: "Gat" },
      { value: "violin-dhun", label: "Dhun" },
      { value: "violin-other", label: "Other (Violin)" },
    ],
  },
  {
    value: "harmonium",
    label: "Harmonium",
    forms: [
      { value: "harmonium-solo-gat", label: "Solo Gat" },
      { value: "harmonium-sangat", label: "Sangat (Accompaniment)" },
      { value: "harmonium-raag-exposition", label: "Raag Exposition" },
      { value: "harmonium-other", label: "Other (Harmonium)" },
    ],
  },
  {
    value: "general",
    label: "General / All Instruments",
    forms: [
      { value: "history-theory", label: "History/Theory" },
      { value: "general-raag-taal", label: "Raag & Taal Theory" },
      { value: "general-gharana", label: "Gharana/Lineage" },
      { value: "other", label: "Other" },
    ],
  },
];

export const ALL_FORMS: KnowledgeForm[] = INSTRUMENTS.flatMap((i) => i.forms);

export function formLabel(value: string): string {
  return ALL_FORMS.find((f) => f.value === value)?.label || value;
}

export function instrumentForForm(value: string): KnowledgeInstrument | undefined {
  return INSTRUMENTS.find((i) => i.forms.some((f) => f.value === value));
}
