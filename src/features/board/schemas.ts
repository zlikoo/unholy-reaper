import { z } from "zod";
import { POST_AUDIENCES, POST_CATEGORIES } from "@/lib/labels";
import { checkbox, enumField, optionalDateTimeField, requiredText } from "@/lib/validation";

const categories = POST_CATEGORIES as [(typeof POST_CATEGORIES)[number], ...(typeof POST_CATEGORIES)[number][]];
const audiences = POST_AUDIENCES as [(typeof POST_AUDIENCES)[number], ...(typeof POST_AUDIENCES)[number][]];

export const postSchema = z.object({
  title: requiredText("Titel", 120),
  content: requiredText("Text", 5000),
  category: enumField(categories, "eine Kategorie"),
  audience: enumField(audiences, "die Sichtbarkeit"),
  eventAt: optionalDateTimeField("Termin"),
  pinned: checkbox,
});
