-- Credit officers need dealership names on the credit queue (applications → companies join).
-- Previously only admins / users reading their own company_id could SELECT companies,
-- so the Dealership column was always blank for credit_officer sessions.
-- Read-only; no insert/update/delete.

CREATE POLICY "Credit officers can read companies"
  ON public.companies
  FOR SELECT
  TO public
  USING (public.is_credit_officer());
