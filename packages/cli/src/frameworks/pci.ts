import type { Control } from "../types.js";

export const PCI_CONTROLS: Control[] = [
  {
    id: "3.4.1",
    title: "PAN Protection at Rest",
    severity_default: "critical",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /(card[_-]?number|pan|credit[_-]?card)\s*:\s*(varchar|text|string)/i,
    ],
    bob_prompt_template:
      "Identify cardholder PAN stored as plaintext. PCI-DSS 3.4.1.",
  },
  {
    id: "3.3.1",
    title: "CVV Storage Prohibited",
    severity_default: "critical",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /(cvv|cvc|cvv2|csc)\s*[:=]/i,
      /save.*cvv/i,
    ],
    bob_prompt_template:
      "Identify any storage of CVV/CVC. Strictly prohibited by PCI-DSS 3.3.1.",
  },
  {
    id: "4.2.1",
    title: "Strong Cryptography for Transmission",
    severity_default: "critical",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /http:\/\/[^'"`\s]+\/(billing|payment|charge)/i,
    ],
    bob_prompt_template:
      "Identify HTTP transmission of payment data. PCI-DSS 4.2.1.",
  },
  {
    id: "6.4.3",
    title: "Production Test Card Data",
    severity_default: "high",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /4111[\s-]?1111[\s-]?1111[\s-]?1111/,
      /test.*card/i,
    ],
    bob_prompt_template:
      "Identify test card data committed to production code. PCI-DSS 6.4.3.",
  },
];

export const PCI_CONTROL_BY_ID: Record<string, Control> = Object.fromEntries(
  PCI_CONTROLS.map((c) => [c.id, c]),
);
