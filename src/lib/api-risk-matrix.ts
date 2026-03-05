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

// Level label lookups
export const LEVEL_LABELS: Record<string, string> = {
  VL: 'Very Low', L: 'Low', M: 'Medium', H: 'High', VH: 'Very High',
  // 4x4 Operational
  Rare: 'Rare', Possible: 'Possible', Likely: 'Likely', 'Almost Certain': 'Almost Certain',
  Minor: 'Minor', Moderate: 'Moderate', Major: 'Major', Severe: 'Severe',
};

// ─── Standard Templates ─────────────────────────────────────────────

export interface RiskMatrixTemplate {
  key: string;
  name: string;
  description: string;
  impactLevels: string[];
  frequencyLevels: string[];
  acceptableCells: [string, string][];
}

export const STANDARD_TEMPLATES: RiskMatrixTemplate[] = [
  {
    key: 'iso31000',
    name: 'ISO 31000 / ISO 27005 (5×5)',
    description: 'Default enterprise & information-security risk matrix based on ISO 31000 and ISO 27005.',
    impactLevels: ['VL', 'L', 'M', 'H', 'VH'],
    frequencyLevels: ['VL', 'L', 'M', 'H', 'VH'],
    acceptableCells: [
      ['VL', 'VL'], ['VL', 'L'], ['VL', 'M'], ['VL', 'H'], ['VL', 'VH'],
      ['L', 'VL'], ['L', 'L'], ['L', 'M'], ['L', 'H'],
      ['M', 'VL'], ['M', 'L'], ['M', 'M'],
      ['H', 'VL'], ['H', 'L'],
      ['VH', 'VL'],
    ],
  },
  {
    key: 'basic3x3',
    name: 'Basic 3×3 (Simple Assessment)',
    description: 'Quick assessments, small organizations, and early risk screening.',
    impactLevels: ['L', 'M', 'H'],
    frequencyLevels: ['L', 'M', 'H'],
    acceptableCells: [
      ['L', 'L'], ['L', 'M'], ['L', 'H'],
      ['M', 'L'], ['M', 'M'],
      ['H', 'L'],
    ],
  },
  {
    key: 'operational4x4',
    name: 'Operational / Audit (4×4)',
    description: 'Internal audit, operational risk, and compliance frameworks.',
    impactLevels: ['Minor', 'Moderate', 'Major', 'Severe'],
    frequencyLevels: ['Rare', 'Possible', 'Likely', 'Almost Certain'],
    acceptableCells: [
      ['Minor', 'Rare'], ['Minor', 'Possible'], ['Minor', 'Likely'], ['Minor', 'Almost Certain'],
      ['Moderate', 'Rare'], ['Moderate', 'Possible'], ['Moderate', 'Likely'],
      ['Major', 'Rare'], ['Major', 'Possible'],
      ['Severe', 'Rare'],
    ],
  },
];

// Convenience aliases for the default ISO template
export const STANDARD_IMPACT_LEVELS = STANDARD_TEMPLATES[0].impactLevels;
export const STANDARD_FREQUENCY_LEVELS = STANDARD_TEMPLATES[0].frequencyLevels;
export const STANDARD_ACCEPTABLE_CELLS = STANDARD_TEMPLATES[0].acceptableCells;

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
  impactLevels?: string[],
  frequencyLevels?: string[],
): Promise<RiskMatrix> {
  const payload: Record<string, unknown> = {
    matrix_type: matrixType,
    name: name || (matrixType === 'standard' ? 'Standard Risk Matrix' : 'Custom Risk Matrix'),
    description: description || null,
  };
  if (impactLevels) payload.impact_levels = impactLevels;
  if (frequencyLevels) payload.frequency_levels = frequencyLevels;

  const existing = await fetchRiskMatrix(processId);
  if (existing) {
    const { data, error } = await supabase
      .from('risk_matrices')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as RiskMatrix;
  }

  const { data, error } = await supabase
    .from('risk_matrices')
    .insert({ process_id: processId, ...payload } as any)
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
  const { error } = await supabase
    .from('risk_matrix_cells')
    .upsert(
      { matrix_id: matrixId, impact_level: impactLevel, frequency_level: frequencyLevel, acceptable },
      { onConflict: 'matrix_id,impact_level,frequency_level' }
    );
  if (error) throw error;
}

/** Apply a template's cells to a matrix. Falls back to ISO 31000 default. */
export async function applyTemplateMatrix(matrixId: string, templateKey?: string) {
  const template = STANDARD_TEMPLATES.find(t => t.key === templateKey) || STANDARD_TEMPLATES[0];

  await supabase.from('risk_matrix_cells').delete().eq('matrix_id', matrixId);

  const cells = [];
  for (const impact of template.impactLevels) {
    for (const freq of template.frequencyLevels) {
      const acceptable = template.acceptableCells.some(
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

/** @deprecated use applyTemplateMatrix */
export const applyStandardMatrix = (matrixId: string) => applyTemplateMatrix(matrixId, 'iso31000');
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
