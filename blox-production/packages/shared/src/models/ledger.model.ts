export interface Ledger {
  id: string;
  transactionType: string;
  amount: number;
  description: string;
  date: string;
  reference?: string;
  status: string;
}

export interface LedgerFilter {
  startDate?: string;
  endDate?: string;
  transactionType?: string;
}
