import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const TABLES = [
  'clients',
  'client_users',
  'profiles',
  'user_roles',
  'projects',
  'project_stages',
  'project_stage_items',
  'project_milestones',
  'project_evolutions',
  'evolution_stages',
  'evolution_stage_items',
  'project_versions',
  'project_announcements',
  'documents',
  'videos',
  'support_tickets',
  'dashboard_links',
  'notifications',
  'chat_conversations',
  'chat_messages',
] as const;

/** Admin-only: export every readable table to a multi-sheet .xlsx. */
export async function exportAllDataToExcel() {
  const wb = XLSX.utils.book_new();

  for (const table of TABLES) {
    try {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .limit(10000);
      if (error) {
        console.warn(`[export] ${table}: ${error.message}`);
        const ws = XLSX.utils.aoa_to_sheet([['ERRO'], [error.message]]);
        XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31));
        continue;
      }
      const rows = (data as any[]) || [];
      const ws = rows.length > 0
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet([['(sem registros)']]);
      XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31));
    } catch (e: any) {
      console.warn(`[export] ${table}: ${e.message}`);
    }
  }

  const filename = `smartest-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
