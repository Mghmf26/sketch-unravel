import { supabase } from '@/integrations/supabase/client';

export interface EntityComment {
  id: string;
  entity_type: string;
  entity_id: string;
  process_id: string;
  comment: string | null;
  conclusion: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntityAttachment {
  id: string;
  entity_type: string;
  entity_id: string;
  process_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

// Comments
export async function fetchEntityComments(entityType: string, entityId: string) {
  const { data } = await supabase.from('entity_comments').select('*')
    .eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
  return (data || []) as EntityComment[];
}

export async function fetchAllEntityComments(processId: string) {
  const { data } = await supabase.from('entity_comments').select('*')
    .eq('process_id', processId).order('created_at', { ascending: false });
  return (data || []) as EntityComment[];
}

export async function insertEntityComment(c: Partial<EntityComment>) {
  const { data, error } = await supabase.from('entity_comments').insert(c as any).select().single();
  if (error) throw error;
  return data as EntityComment;
}

export async function updateEntityComment(id: string, c: Partial<EntityComment>) {
  const { error } = await supabase.from('entity_comments').update(c).eq('id', id);
  if (error) throw error;
}

export async function deleteEntityComment(id: string) {
  const { error } = await supabase.from('entity_comments').delete().eq('id', id);
  if (error) throw error;
}

// Attachments
export async function fetchEntityAttachments(entityType: string, entityId: string) {
  const { data } = await supabase.from('entity_attachments').select('*')
    .eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
  return (data || []) as EntityAttachment[];
}

export async function fetchAllEntityAttachments(processId: string) {
  const { data } = await supabase.from('entity_attachments').select('*')
    .eq('process_id', processId).order('created_at', { ascending: false });
  return (data || []) as EntityAttachment[];
}

export async function insertEntityAttachment(a: Partial<EntityAttachment>) {
  const { data, error } = await supabase.from('entity_attachments').insert(a as any).select().single();
  if (error) throw error;
  return data as EntityAttachment;
}

export async function deleteEntityAttachment(id: string) {
  const { error } = await supabase.from('entity_attachments').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadEntityFile(file: File, processId: string) {
  const ext = file.name.split('.').pop();
  const path = `${processId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('entity-attachments').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('entity-attachments').getPublicUrl(path);
  return publicUrl;
}
