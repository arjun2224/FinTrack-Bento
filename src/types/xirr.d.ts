declare module "xirr" {
    export interface CashFlow {
        amount: number;
        date: Date;
    }

    export function xirr(cashflows: CashFlow[], options?: { guess?: number }): number;
}
