export type UploadedFile = {
  provider: "drive";
  url: string;
  mimeType: string;
};

export type BotDocument = {
  botID: string;
  typeModel: string;
  botName: string;

  websiteLink?: string;        // dùng cho urlContext
  uploadFile?: UploadedFile;  // Drive file

  adjustBotResponses: {
    question: string; // luôn ""
    answer: string;   // instruction
  }[];

  createdAt: number;
};