export interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<Float32Array[]>;
  embedQuery(text: string): Promise<Float32Array>;
}

export interface ChatProvider {
  generate(systemInstruction: string, prompt: string): Promise<string>;
}
