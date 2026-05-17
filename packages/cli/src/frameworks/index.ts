import { HIPAA_CONTROLS, HIPAA_CONTROL_BY_ID } from "./hipaa.js";
import { SOC2_CONTROLS, SOC2_CONTROL_BY_ID } from "./soc2.js";
import { PCI_CONTROLS, PCI_CONTROL_BY_ID } from "./pci.js";
import { GDPR_CONTROLS, GDPR_CONTROL_BY_ID } from "./gdpr.js";
import type { Control, Framework } from "../types.js";

export function getControls(framework: Framework): Control[] {
  switch (framework) {
    case "hipaa":
      return HIPAA_CONTROLS;
    case "soc2":
      return SOC2_CONTROLS;
    case "pci":
      return PCI_CONTROLS;
    case "gdpr":
      return GDPR_CONTROLS;
  }
}

export function getControlById(framework: Framework, id: string): Control | undefined {
  switch (framework) {
    case "hipaa":
      return HIPAA_CONTROL_BY_ID[id];
    case "soc2":
      return SOC2_CONTROL_BY_ID[id];
    case "pci":
      return PCI_CONTROL_BY_ID[id];
    case "gdpr":
      return GDPR_CONTROL_BY_ID[id];
  }
}

export { HIPAA_CONTROLS, SOC2_CONTROLS, PCI_CONTROLS, GDPR_CONTROLS };
