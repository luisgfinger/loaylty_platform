export type AuthenticatedUser = {
  userId: number;
  personId: number;
  employeeId: number;
  companyId: number;
  role: string | null;

  iat?: number;
  exp?: number;
};