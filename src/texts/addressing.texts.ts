// The words that speak to whoever reads: a surface says what is so, and addresses nobody, in any language.
export const addressingTexts = {
  pronouns: "vos|tu|tus|tuy[oa]s?|te|ti",
  /** English marks whom it speaks to by its pronouns alone: its orders are the same words as its labels. */
  pronounsEn: "you|your|yours|yourself|yourselves",
  /** What is said to someone to make them do it. */
  orders: "escribí|elegí|mirá|usá|anotá|poné|hacé|decí|andá|probá",
  /** Words that end as a verb said to one person does, and are no verb at all. */
  notVerbs: ["después", "además", "demás", "través", "país", "jamás", "atrás", "detrás", "interés", "quizás"],
  /** Words that end as what one person did, and say it of no one: «existe», «contraste». */
  notDone: ["existe", "consiste", "insiste", "persiste", "resiste", "asiste", "triste", "chiste", "viste"],
  notDoneEither: ["contraste", "desgaste", "baste", "paste", "traste"],
} as const;
