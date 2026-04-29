import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  getQnaList, 
  createQna, 
  getQnaDetail,
  answerQna,
  getFaqList, 
  upsertFaq,
  deleteFaq,
  getNoticeList,
  upsertNotice,
  deleteNotice
} from '../../../src/app/actions/support';
import { validateUserAction, validateAdminAction } from '../../../src/lib/auth/guards';

// Mock the auth guards
vi.mock('../../../src/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Support Action Unit Tests', () => {
  let mockSupabase: any;
  let mockUser: any;
  let mockProfile: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    };

    mockUser = { id: 'test-user-id' };
    mockProfile = { id: 'test-user-id', org_id: 'test-org-id', role: 'CORPORATE' };

    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
      profile: mockProfile,
    });

    (validateAdminAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { ...mockUser, role: 'ADMIN' },
      profile: { ...mockProfile, role: 'ADMIN' },
    });
  });

  describe('QnA Actions', () => {
    it('should fetch QnA list with pagination', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [{ id: 'qna-1', title: 'Test QnA', order: { order_no: 'ORD-001' }, answer_count: [{ count: 0 }] }],
        error: null,
        count: 1
      });

      const result = await getQnaList({ limit: 10, offset: 0 });
      expect(result.qnas).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.qnas[0].order_no).toBe('ORD-001');
      expect(mockSupabase.from).toHaveBeenCalledWith('zen_qna');
    });

    it('should create a QnA successfully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'qna-123' },
        error: null
      });

      const result = await createQna({ title: 'Test Title', content: 'Test Content' });
      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Title',
        org_id: 'test-org-id'
      }));
    });

    it('should fetch QnA detail with answers', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'qna-1', title: 'Detail Title', order: { order_no: 'ORD-001' } },
        error: null
      });
      
      // Mock answers fetch
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ id: 'ans-1', content: 'Answer text', profile: { full_name: 'Admin User' } }],
        error: null
      });

      const result = await getQnaDetail('qna-1');
      expect(result.title).toBe('Detail Title');
      expect(result.answers).toHaveLength(1);
      expect(result.answers[0].answered_by_name).toBe('Admin User');
    });

    it('should allow admin to answer QnA and set status to ANSWERED when isFinal is true', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'ans-123' },
        error: null
      });
      // Mock QnA status check
      mockSupabase.single.mockResolvedValueOnce({
        data: { status: 'PENDING', created_by: 'cust-1', title: 'Help' },
        error: null
      });

      const result = await answerQna({ qnaId: 'qna-1', content: 'Resolved', isFinal: true });
      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'ANSWERED' });
    });

    it('should set status to IN_PROGRESS when first answer is given (isFinal is false)', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'ans-456' },
        error: null
      });
      // Mock QnA status check (PENDING status)
      mockSupabase.single.mockResolvedValueOnce({
        data: { status: 'PENDING', created_by: 'cust-1', title: 'Question' },
        error: null
      });

      const result = await answerQna({ qnaId: 'qna-1', content: 'Processing...', isFinal: false });
      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'IN_PROGRESS' });
    });
  });

  describe('FAQ Actions', () => {
    it('should fetch FAQ list and support keyword filtering', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ id: 'faq-1', question: 'How to use?', answer: 'Like this' }],
        error: null
      });

      const result = await getFaqList({ keyword: 'test' });
      expect(result.faqs).toHaveLength(1);
      // Verify keyword filter (or query)
      expect(mockSupabase.or).toHaveBeenCalledWith("question.ilike.%test%,answer.ilike.%test%");
    });

    it('should allow admin to upsert FAQ', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'new-faq-id' },
        error: null
      });

      const result = await upsertFaq({ 
        category: 'ORDER', 
        question: 'Q?', 
        answer: 'A!' 
      });
      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        category: 'ORDER'
      }));
    });
  });

  describe('Notice Actions', () => {
    it('should fetch Notice list with pagination', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [{ id: 'notice-1', title: 'System Update', is_published: true }],
        error: null,
        count: 5
      });

      const result = await getNoticeList({ limit: 5, offset: 0 });
      expect(result.notices).toHaveLength(1);
      expect(result.total).toBe(5);
    });

    it('should allow admin to upsert Notice and set published_at if is_published is true', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'notice-99' },
        error: null
      });

      const result = await upsertNotice({
        title: 'New Policy',
        content: 'Content here',
        is_published: true
      });
      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        is_published: true,
        published_at: expect.any(String)
      }));
    });

    it('should allow admin to delete Notice', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      const result = await deleteNotice('notice-99');
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('zen_notices');
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });
});

