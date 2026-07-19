'use server';

import { createSSRClient } from '../../../utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function upsertTask(formData: FormData) {
  const supabase = await createSSRClient();
  
  const id = formData.get('id') as string | null;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const cadence = formData.get('cadence') as string;
  const reward_amount = parseInt(formData.get('reward_amount') as string, 10);
  const target_app = formData.get('target_app') as string;
  const is_active = formData.get('is_active') === 'true';

  const taskData = {
    title,
    description,
    cadence,
    reward_amount,
    target_app,
    is_active,
  };

  if (id) {
    await supabase.from('global_tasks').update(taskData).eq('id', id);
  } else {
    await supabase.from('global_tasks').insert(taskData);
  }

  revalidatePath('/admin/tasks');
}

export async function toggleTaskStatus(id: string, is_active: boolean) {
  const supabase = await createSSRClient();
  await supabase.from('global_tasks').update({ is_active }).eq('id', id);
  revalidatePath('/admin/tasks');
}
