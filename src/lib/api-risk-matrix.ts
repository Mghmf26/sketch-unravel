import { supabase } from '@/integrations/supabase/client';

export interface RiskMatrix {
  id: string;
  process_id: string;
  matrix_type: string;
  name: string;
  description: string | null;
  impact_levels: string[];
  frequency_levels: string[];
  created_at: string;
  updated_at: string;
}

export interface RiskMatrixCell {
  id: string;
  matrix_id: string;
  impact_level: string;
  frequency_level: string;
  acceptable: boolean;
  created_at: string;
}

// Standard risk matrix definition (5x5)
export const STANDARD_IMPACT_LEVELS = ['VL', 'L', 'M', 'H', 'VH'];
export const STANDARD_FREQUENCY_LEVELS = ['VL', 'L', 'M', 'H', 'VH'];
export const LEVEL_LABELS: Record<string, string> = {
  VL: 'Very Low', L: 'Low', M: 'Medium', H: 'High', VH: 'Very High',
};

// Standard matrix: acceptable cells (impact, frequency) — conservative standard
export const STANDARD_ACCEPTABLE_CELLS: [string, string][] = [
  ['VL', 'VL'], ['VL', 'L'], ['VL', 'M'], ['VL', 'H'], ['VL', 'VH'],
  ['L', 'VL'], ['L', 'L'], ['L', 'M'], ['L', 'H'],
  ['M', 'VL'], ['M', 'L'], ['M', 'M'],
  ['H', 'VL'], ['H', 'L'],
  ['VH', 'VL'],
];

export async function fetchRiskMatrix(processId: string): Promise<RiskMatrix | null> {
  const { data } = await supabase
    .from('risk_matrices')
    .select('*')
    .eq('process_id', processId)
    .maybeSingle();
  return data as RiskMatrix | null;
}

export async function fetchRiskMatrixCells(matrixId: string): Promise<RiskMatrixCell[]> {
  const { data } = await supabase
    .from('risk_matrix_cells')
    .select('*')
    .eq('matrix_id', matrixId);
  return (data || []) as RiskMatrixCell[];
}

export async function upsertRiskMatrix(
  processId: string,
  matrixType: 'user-defined' | 'standard',
  name?: string,
  description?: string,
): Promise<RiskMatrix> {
  // Check if matrix already exists
  const existing = await fetchRiskMatrix(processId);
  if (existing) {
    const { data, error } = await supabase
      .from('risk_matrices')
      .update({
        matrix_type: matrixType,
        name: name || (matrixType === 'standard' ? 'Standard Risk Matrix' : 'Custom Risk Matrix'),
        description: description || null,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as RiskMatrix;
  }

  const { data, error } = await supabase
    .from('risk_matrices')
    .insert({
      process_id: processId,
      matrix_type: matrixType,
      name: name || (matrixType === 'standard' ? 'Standard Risk Matrix' : 'Custom Risk Matrix'),
      description: description || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as RiskMatrix;
}

export async function deleteRiskMatrix(id: string) {
  const { error } = await supabase.from('risk_matrices').delete().eq('id', id);
  if (error) throw error;
}

export async function saveCellAcceptability(
  matrixId: string,
  impactLevel: string,
  frequencyLevel: string,
  acceptable: boolean,
) {
  // Upsert the cell
  const { error } = await supabase
    .from('risk_matrix_cells')
    .upsert(
      { matrix_id: matrixId, impact_level: impactLevel, frequency_level: frequencyLevel, acceptable },
      { onConflict: 'matrix_id,impact_level,frequency_level' }
    );
  if (error) throw error;
}

export async function applyStandardMatrix(matrixId: string) {
  // Delete all existing cells
  await supabase.from('risk_matrix_cells').delete().eq('matrix_id', matrixId);

  // Insert standard cells
  const cells = [];
  for (const impact of STANDARD_IMPACT_LEVELS) {
    for (const freq of STANDARD_FREQUENCY_LEVELS) {
      const acceptable = STANDARD_ACCEPTABLE_CELLS.some(
        ([i, f]) => i === impact && f === freq
      );
      cells.push({
        matrix_id: matrixId,
        impact_level: impact,
        frequency_level: freq,
        acceptable,
      });
    }
  }
  const { error } = await supabase.from('risk_matrix_cells').insert(cells);
  if (error) throw error;
}
