export type AdjustBotResponse = {
  question: string; 
  answer: string;  
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
