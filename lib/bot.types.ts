export type AdjustBotResponse = {
  question: string; // LUÔN ""
  answer: string;   // instruction
};

export type BotDocument = {
  botID: string;
  typeModel: string;
  botName: string;

  websiteLink?: string;
  uploadFile?: string;

  adjustBotResponses: AdjustBotResponse[];

  createdAt: number;
};
