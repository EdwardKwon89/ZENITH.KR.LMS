export type CustomsStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'HELD' | 'REJECTED';

export interface CustomsDeclaration {
  id: string;
  order_id: string;
  order_no?: string; // orders 테이블 JOIN
  shipper_name?: string; // profiles JOIN
  adapter_type: string;
  status: CustomsStatus;
  declaration_no: string | null;
  cargo_description: string | null;
  declared_value: number | null;
  currency_code: string;
  admin_note: string | null;
  submitted_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICustomsAdapter {
  submitDeclaration(declaration: CustomsDeclaration): Promise<{ success: boolean; declarationNo?: string }>;
  getStatus(declarationNo: string): Promise<CustomsStatus>;
}
