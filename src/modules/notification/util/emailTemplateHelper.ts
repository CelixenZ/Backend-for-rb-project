import * as fs from "fs/promises";
import { TEMPLATE_LOCATION } from "../../../config/mail.config";
import { EmailRemiderVairablesTemplate } from "../types";

export async function renderTemplateAsync(variables: EmailRemiderVairablesTemplate) {
  let content = await fs.readFile(TEMPLATE_LOCATION.REMINDER_ALERT, "utf-8");

  for (const [k, v] of Object.entries(variables)) {
    content = content.replace(`{{${k}}}`, String(v));
  }

  return content;
}
