export interface PaginatedApiResponse<T> {
  status: number;
  message?: string;
  data: T[];
  total: number;
  pageNumber: number;
  limit: number;
}
