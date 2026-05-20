import { logger } from '@/lib/logger';
'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { USER_ROLES } from '@/lib/auth/rbac';



export async function login(formData: FormData) {
  logger.info('[ACTION] login START');
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const locale = formData.get('locale') as string || 'ko';

  logger.info('[ACTION] login INPUT:', { email, locale });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('[ACTION] login AUTH ERROR:', error.message);
      return { error: error.message };
    }

    logger.info('[ACTION] login AUTH SUCCESS:', data.user?.id);

    // Redirect to orders as the primary dashboard view with locale prefix
    revalidatePath('/', 'layout');
    logger.info('[ACTION] login REDIRECTING to:', `/${locale}/orders`);
    
    // Using redirect inside try-catch is tricky in Next.js.
    // It's better to return success and let the client handle redirect, 
    // or call redirect outside the try-catch.
  } catch (e: any) {
    if (e.message?.includes('NEXT_REDIRECT')) {
      throw e; 
    }
    logger.error('[ACTION] login UNEXPECTED ERROR:', e);
    return { error: 'An unexpected error occurred during login.' };
  }
  
  // Call redirect outside try-catch
  const formDataLocale = formData.get('locale') as string || 'ko';
  redirect(`/${formDataLocale}/orders`);
}

export async function signup(formData: FormData, locale: string = 'ko') {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const orgId = formData.get('org_id') as string | null;
  const isNewOrg = formData.get('is_new_org') === 'true';
  const orgName = formData.get('org_name') as string | null;
  const businessNumber = formData.get('business_number') as string | null;

  logger.info('[SIGNUP_ACTION] Received signup request:', { email, fullName, isNewOrg, orgName });
  
  // Master Edward's Policy: Personal accounts are assigned 'SHIPPER' by default.
  let orgType = formData.get('org_type') as string | null;
  if (!orgType && !isNewOrg && !orgId) {
    orgType = 'SHIPPER';
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        org_id: orgId,
        is_new_org: isNewOrg,
        org_name: orgName,
        business_number: businessNumber,
        org_type: orgType,
        // Individual users are ACTIVE immediately; Corporate/New Org users are PENDING.
        status: (orgId === null && !isNewOrg) ? 'ACTIVE' : 'PENDING',
        // New Org creators are ADMIN; Joinees are MEMBER; Individuals are USER.
        role: isNewOrg ? USER_ROLES.ADMIN : (orgId === null ? USER_ROLES.INDIVIDUAL : USER_ROLES.USER),
      }
    }
  });

  if (error) {
    return { error: error.message };
  }

  // Handle Document Upload if present
  const docFile = formData.get('doc_file') as File | null;
  if (docFile && data?.user) {
    const adminClient = await createAdminClient();

    // Wait a brief moment to ensure trigger created the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: profile } = await adminClient
      .from('zen_profiles')
      .select('org_id')
      .eq('id', data.user.id)
      .single();

    if (profile?.org_id) {
      const fileExt = docFile.name.split('.').pop();
      const filePath = `${profile.org_id}/${Date.now()}_${docFile.name}`;
      
      const { error: uploadError } = await adminClient.storage
        .from('business_docs')
        .upload(filePath, docFile, {
          contentType: docFile.type,
          upsert: false
        });
      
      if (!uploadError) {
        await adminClient
          .from('zen_organization_documents')
          .insert({
            org_id: profile.org_id,
            doc_type: 'BIZ_REG',
            file_path: filePath,
            status: 'PENDING'
          });
      } else {
        logger.error('Upload Error:', uploadError);
      }
    }
  }

  return { success: true };
}
