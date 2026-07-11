import { createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

export type AuthMetadata = {
  role?: string;
  org_id?: string;
  org_type?: string;
  status?: string;
};

export async function syncAuthMetadata(userId: string, metadata: AuthMetadata): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { data: currentUser } = await admin.auth.admin.getUserById(userId);
    if (currentUser?.user?.app_metadata) {
      await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...currentUser.user.app_metadata, ...metadata },
      });
      logger.info(`[AUTH_SYNC] Synced auth metadata for user ${userId}:`, metadata);
    }
  } catch (e) {
    logger.error(`[AUTH_SYNC] Failed to sync auth metadata for user ${userId}:`, e);
  }
}
