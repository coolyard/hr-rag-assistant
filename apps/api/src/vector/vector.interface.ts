export interface DocumentMeta {
  chunkId: string;
  documentName: string;
  documentTitle: string;
  category: string;
  categoryName: string;
  heading: string;
  content: string;
  charCount: number;
}

export interface SearchResult {
  chunkId: string;
  content: string;
  documentName: string;
  documentTitle: string;
  category: string;
  categoryName: string;
  heading: string;
  similarity: number;
  metadata: DocumentMeta;
}

export interface IVectorStore {
  add(id: string, embedding: number[], metadata: DocumentMeta): void;
  search(queryEmbedding: number[], topK: number): SearchResult[];
  clear(): void;
  count(): number;
  get(id: string): { embedding: number[]; metadata: DocumentMeta } | null;
  getAll(): SearchResult[];
}
