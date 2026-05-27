import { BaseRepository } from './base.repository';

export interface GradeMasterItem {
  grade_code: string;
  grade_name_ko: string;
  grade_name_en: string | null;
  discount_rate: number;
  benefit_desc: string | null;
}

export interface GradePromotionRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  current_grade: string;
  target_grade: string;
  request_reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_comment: string | null;
  processed_at: string | null;
  created_at: string;
}

/**
 * AdminRepository: Admin 도메인 DB 접근 전담
 *
 * 담당 테이블: zen_profiles, zen_organizations, zen_ports, zen_common_codes,
 *            grade_master, grade_promotion_request, profiles,
 *            zen_rate_cards, zen_rate_tiers, zen_rate_surcharges,
 *            zen_organization_documents
 */
export class AdminRepository extends BaseRepository {

  // ─── zen_profiles ─────────────────────────────────────────────

  async findProfileById(userId: string) {
    return this.db
      .from('zen_profiles')
      .select('id, email, role, org_id, status')
      .eq('id', userId)
      .single();
  }

  async findProfileSession(userId: string) {
    return this.db
      .from('zen_profiles')
      .select('id, email, role, org_id, status')
      .eq('id', userId)
      .single();
  }

  async findProfileByNameAndEmail(fullName: string, email: string) {
    return this.db
      .from('zen_profiles')
      .select('email')
      .eq('full_name', fullName)
      .eq('email', email)
      .maybeSingle();
  }

  async findProfilesByName(fullName: string) {
    return this.db
      .from('zen_profiles')
      .select('email, phone_number')
      .eq('full_name', fullName)
      .maybeSingle();
  }

  async findCorporateAdminEmail(orgName: string, regNo: string) {
    return this.db
      .from('zen_organizations')
      .select(`
        id,
        zen_profiles!inner(id, email)
      `)
      .eq('name', orgName)
      .eq('registration_no', regNo)
      .maybeSingle();
  }

  async findProfileGrade(userId: string) {
    return this.db
      .from('zen_profiles')
      .select('grade_code')
      .eq('id', userId)
      .maybeSingle();
  }

  async updateProfileFullName(userId: string, fullName: string) {
    return this.db
      .from('zen_profiles')
      .update({ full_name: fullName })
      .eq('id', userId);
  }

  async deactivateProfile(userId: string) {
    return this.db
      .from('zen_profiles')
      .update({ is_active: false })
      .eq('id', userId);
  }

  async updateProfileGrade(userId: string, gradeCode: string) {
    return this.db
      .from('zen_profiles')
      .update({ grade_code: gradeCode })
      .eq('id', userId);
  }

  async updateProfileStatus(userId: string, status: string) {
    return this.db
      .from('zen_profiles')
      .update({ status })
      .eq('id', userId);
  }

  async findMembers(params: {
    status?: string;
    role?: string;
    keyword?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.db
      .from('zen_profiles')
      .select('id, email, full_name, role, status, grade_code, org_id, created_at, is_active', { count: 'exact' });

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.role) {
      query = query.eq('role', params.role);
    }

    if (params.keyword) {
      query = query.or(`full_name.ilike.%${params.keyword}%,email.ilike.%${params.keyword}%`);
    }

    query = query.order('created_at', { ascending: false });

    if (params.limit) query = query.range(params.offset || 0, (params.offset || 0) + params.limit - 1);

    return query;
  }

  async findAdminProfiles() {
    return this.db
      .from('zen_profiles')
      .select('id')
      .in('role', ['ADMIN', 'ZENITH_SUPER_ADMIN']);
  }

  // ─── grade_master ─────────────────────────────────────────────

  async findGradeMaster(): Promise<GradeMasterItem[]> {
    const { data, error } = await this.db
      .from('grade_master')
      .select('grade_code, grade_name_ko, grade_name_en, discount_rate, benefit_desc')
      .order('created_at', { ascending: true });

    if (error) throw new Error('등급 정보를 불러오는 데 실패했습니다.');
    return data || [];
  }

  // ─── grade_promotion_request ──────────────────────────────────

  async findPendingPromotionByUserId(userId: string) {
    return this.db
      .from('grade_promotion_request')
      .select('target_grade, request_reason')
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .maybeSingle();
  }

  async findExistingPendingRequest(userId: string) {
    return this.db
      .from('grade_promotion_request')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .maybeSingle();
  }

  async insertPromotionRequest(data: Record<string, unknown>) {
    return this.db
      .from('grade_promotion_request')
      .insert(data)
      .select('id')
      .single();
  }

  async findPromotionRequests(params?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    limit?: number;
    offset?: number;
  }) {
    let query = this.db
      .from('grade_promotion_request')
      .select(`
        id, user_id, current_grade, target_grade, request_reason, status, admin_comment, processed_at, created_at,
        zen_profiles:user_id (full_name, email)
      `, { count: 'exact' });

    if (params?.status) query = query.eq('status', params.status);

    const limit = params?.limit || 20;
    const offset = params?.offset || 0;

    return query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
  }

  async findPromotionRequestById(requestId: string) {
    return this.db
      .from('grade_promotion_request')
      .select('id, status, target_grade, user_id')
      .eq('id', requestId)
      .single();
  }

  async updatePromotionRequest(requestId: string, data: Record<string, unknown>) {
    return this.db
      .from('grade_promotion_request')
      .update(data)
      .eq('id', requestId);
  }

  // ─── zen_organizations ────────────────────────────────────────

  async findOrganizations(status?: string | string[], page = 1, pageSize = 50) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.db
      .from('zen_organizations')
      .select('*, zen_organization_documents(*)', { count: 'exact' });

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    return query.order('created_at', { ascending: false }).range(from, to);
  }

  async approveOrganization(orgId: string) {
    return this.db.rpc('approve_organization', { target_org_id: orgId });
  }

  async rejectOrganization(orgId: string, reason: string) {
    return this.db.rpc('reject_organization', { target_org_id: orgId, comment: reason });
  }

  async requestOrganizationSupplement(orgId: string, reason: string) {
    return this.db.rpc('request_organization_supplement', { target_org_id: orgId, comment: reason });
  }

  // ─── zen_ports ────────────────────────────────────────────────

  async findPortById(portId: string) {
    return this.db
      .from('zen_ports')
      .select('*')
      .eq('id', portId)
      .single();
  }

  async findPorts() {
    const { data, error } = await this.db.from('zen_ports').select('*').order('code', { ascending: true });
    return { data, error };
  }

  // ─── zen_common_codes ─────────────────────────────────────────

  async findCommonCodesByGroup(groupCode: string) {
    return this.db
      .from('zen_common_codes')
      .select('*')
      .eq('group_code', groupCode)
      .order('sort_order', { ascending: true });
  }

  // ─── zen_rate_cards (+ tiers, surcharges) ─────────────────────

  async findExistingActiveRateCards(orgId: string, originCode: string, destCode: string, mode: string) {
    return this.db
      .from('zen_rate_cards')
      .select('id, version_no')
      .eq('org_id', orgId)
      .eq('origin_code', originCode)
      .eq('dest_code', destCode)
      .eq('mode', mode)
      .eq('status', 'ACTIVE');
  }

  async supersedeRateCards(ids: string[]) {
    return this.db
      .from('zen_rate_cards')
      .update({ status: 'SUPERSEDED' })
      .in('id', ids);
  }

  async insertRateCard(data: Record<string, unknown>) {
    return this.db
      .from('zen_rate_cards')
      .insert(data)
      .select('id')
      .single();
  }

  async insertRateTiers(tiers: Array<Record<string, unknown>>) {
    return this.db.from('zen_rate_tiers').insert(tiers);
  }

  async insertRateSurcharges(surcharges: Array<Record<string, unknown>>) {
    return this.db.from('zen_rate_surcharges').insert(surcharges);
  }

  async deleteRateCard(cardId: string) {
    return this.db.from('zen_rate_cards').delete().eq('id', cardId);
  }

  async findRateCards(filters: {
    origin_code?: string;
    dest_code?: string;
    mode?: string;
    status?: string;
    orgId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.db
      .from('zen_rate_cards')
      .select(`
        *,
        origin_port:origin_code,
        destination_port:dest_code,
        service_type:mode,
        carrier:zen_organizations!org_id(name, iata_code),
        tiers:zen_rate_tiers(*),
        surcharges:zen_rate_surcharges(*)
      `, { count: 'exact' });

    if (filters.orgId) query = query.eq('org_id', filters.orgId);
    if (filters.origin_code) query = query.eq('origin_code', filters.origin_code);
    if (filters.dest_code) query = query.eq('dest_code', filters.dest_code);
    if (filters.mode) query = query.eq('mode', filters.mode);
    if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);

    return query.order('created_at', { ascending: false }).range(from, to);
  }

  // ─── zen_system_settings ──────────────────────────────────────

  async findSettingByKey(key: string) {
    return this.db
      .from('zen_system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single();
  }
}
