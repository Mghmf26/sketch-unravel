import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { updateProcessRaci, insertProcessRaci, type ProcessRaci } from '@/lib/api-raci';
import { Pencil, Plus } from 'lucide-react';

interface EditRaciDialogProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  /** If provided, we're editing. Otherwise creating. */
  entry?: ProcessRaci | null;
  /** Required for creating new entries */
  processId?: string;
}

export default function EditRaciDialog({ open, onClose, onRefresh, entry, processId }: EditRaciDialogProps) {
  const isEdit = !!entry;

  const [roleName, setRoleName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [functionDept, setFunctionDept] = useState('');
  const [subFunction, setSubFunction] = useState('');
  const [seniority, setSeniority] = useState('');
  const [tenure, setTenure] = useState('');
  const [grade, setGrade] = useState('');
  const [fte, setFte] = useState('');
  const [salary, setSalary] = useState('');
  const [managerStatus, setManagerStatus] = useState('');
  const [spanOfControl, setSpanOfControl] = useState('');
  const [responsible, setResponsible] = useState('');
  const [accountable, setAccountable] = useState('');
  const [consulted, setConsulted] = useState('');
  const [informed, setInformed] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setRoleName(entry.role_name || '');
      setJobTitle(entry.job_title || '');
      setJobDesc(entry.job_description || '');
      setFunctionDept(entry.function_dept || '');
      setSubFunction(entry.sub_function || '');
      setSeniority(entry.seniority || '');
      setTenure(entry.tenure || '');
      setGrade(entry.grade || '');
      setFte(entry.fte != null ? String(entry.fte) : '');
      setSalary(entry.salary != null ? String(entry.salary) : '');
      setManagerStatus(entry.manager_status || '');
      setSpanOfControl(entry.span_of_control != null ? String(entry.span_of_control) : '');
      setResponsible(entry.responsible || '');
      setAccountable(entry.accountable || '');
      setConsulted(entry.consulted || '');
      setInformed(entry.informed || '');
    } else {
      setRoleName(''); setJobTitle(''); setJobDesc(''); setFunctionDept('');
      setSubFunction(''); setSeniority(''); setTenure(''); setGrade('');
      setFte(''); setSalary(''); setManagerStatus(''); setSpanOfControl('');
      setResponsible(''); setAccountable(''); setConsulted(''); setInformed('');
    }
  }, [entry, open]);

  const submit = async () => {
    if (!roleName.trim() || !jobTitle.trim() || !functionDept.trim()) {
      toast({ title: 'Please fill mandatory fields (Role Name, Job Title, Function)', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        role_name: roleName.trim(),
        job_title: jobTitle.trim(),
        job_description: jobDesc.trim() || null,
        function_dept: functionDept.trim(),
        sub_function: subFunction.trim() || null,
        seniority: seniority.trim() || null,
        tenure: tenure.trim() || null,
        grade: grade.trim() || null,
        fte: fte ? parseFloat(fte) : null,
        salary: salary ? parseFloat(salary) : null,
        manager_status: managerStatus || null,
        span_of_control: spanOfControl ? parseInt(spanOfControl) : null,
        responsible: responsible || null,
        accountable: accountable || null,
        consulted: consulted || null,
        informed: informed || null,
      };
      if (isEdit && entry) {
        await updateProcessRaci(entry.id, payload);
        toast({ title: 'RACI role updated' });
      } else {
        payload.process_id = processId;
        await insertProcessRaci(payload);
        toast({ title: 'RACI role added' });
      }
      onRefresh();
      onClose();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
            {isEdit ? 'Edit RACI Role' : 'Add RACI Role'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the role details and RACI assignments.' : 'Define a role at the business process level. Fields marked with * are mandatory.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Role / Function Name *</Label>
            <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Finance Manager, IT Operations" />
          </div>
          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Job Title *</Label>
              <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Standardized role title" />
            </div>
            <div className="grid gap-1.5">
              <Label>Function (Department) *</Label>
              <Input value={functionDept} onChange={e => setFunctionDept(e.target.value)} placeholder="e.g. Finance, IT" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Job Description</Label>
            <Textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Short description of the role" className="min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Sub Function</Label>
              <Input value={subFunction} onChange={e => setSubFunction(e.target.value)} placeholder="e.g. Accounts Payable" />
            </div>
            <div className="grid gap-1.5">
              <Label>Seniority</Label>
              <Input value={seniority} onChange={e => setSeniority(e.target.value)} placeholder="e.g. Senior, Lead" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Tenure</Label>
              <Input value={tenure} onChange={e => setTenure(e.target.value)} placeholder="e.g. 5 years" />
            </div>
            <div className="grid gap-1.5">
              <Label>Grade</Label>
              <Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. L4" />
            </div>
            <div className="grid gap-1.5">
              <Label>FTE</Label>
              <Input type="number" step="0.1" value={fte} onChange={e => setFte(e.target.value)} placeholder="1.0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Salary</Label>
              <Input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="Annual" />
            </div>
            <div className="grid gap-1.5">
              <Label>Manager Status</Label>
              <Select value={managerStatus || '__none__'} onValueChange={v => setManagerStatus(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select —</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Span of Control</Label>
              <Input type="number" value={spanOfControl} onChange={e => setSpanOfControl(e.target.value)} placeholder="# direct reports" />
            </div>
          </div>
          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RACI Assignments</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-emerald-700">Responsible</Label>
              <Input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Comma-separated names" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-blue-700">Accountable</Label>
              <Input value={accountable} onChange={e => setAccountable(e.target.value)} placeholder="Comma-separated names" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-amber-700">Consulted</Label>
              <Input value={consulted} onChange={e => setConsulted(e.target.value)} placeholder="Comma-separated names" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-purple-700">Informed</Label>
              <Input value={informed} onChange={e => setInformed(e.target.value)} placeholder="Comma-separated names" />
            </div>
          </div>
          {/* Preview */}
          <div className="flex gap-1.5 flex-wrap mt-1">
            {responsible && responsible.split(',').map((p, i) => <Badge key={`r${i}`} className="border-0 bg-emerald-100 text-emerald-700 text-[9px]">R: {p.trim()}</Badge>)}
            {accountable && accountable.split(',').map((p, i) => <Badge key={`a${i}`} className="border-0 bg-blue-100 text-blue-700 text-[9px]">A: {p.trim()}</Badge>)}
            {consulted && consulted.split(',').map((p, i) => <Badge key={`c${i}`} className="border-0 bg-amber-100 text-amber-700 text-[9px]">C: {p.trim()}</Badge>)}
            {informed && informed.split(',').map((p, i) => <Badge key={`i${i}`} className="border-0 bg-purple-100 text-purple-700 text-[9px]">I: {p.trim()}</Badge>)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
