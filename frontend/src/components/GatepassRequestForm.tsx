
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useGatepassReasons } from '@/hooks/useLookupData';

interface GatepassRequestFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const LUNCH_REASON = 'Lunch';

const GatepassRequestForm: React.FC<GatepassRequestFormProps> = ({ onSubmit, onCancel }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonDescription, setReasonDescription] = useState('');
  const [reasonDescriptionError, setReasonDescriptionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: reasonRows = [] } = useGatepassReasons();

  const defaultReasons = ['Lunch', 'unit 2', 'visit to vendor', 'out'];
  const reasons = reasonRows.length ? reasonRows.map((reason) => reason.name) : defaultReasons;
  const shouldShowReasonDescription = !!selectedReason && selectedReason !== LUNCH_REASON;
  const isReasonDescriptionMissing = shouldShowReasonDescription && !reasonDescription.trim();

  const handleReasonChange = (value: string) => {
    setSelectedReason(value);

    if (value === LUNCH_REASON) {
      setReasonDescription('');
      setReasonDescriptionError('');
      return;
    }

    if (reasonDescriptionError && reasonDescription.trim()) {
      setReasonDescriptionError('');
    }
  };

  const handleReasonDescriptionChange = (value: string) => {
    setReasonDescription(value);
    if (reasonDescriptionError && value.trim()) {
      setReasonDescriptionError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a purpose",
        variant: "destructive"
      });
      return;
    }

    if (isReasonDescriptionMissing) {
      setReasonDescriptionError('Please enter reason description');
      return;
    }

    const purpose = shouldShowReasonDescription
      ? `${selectedReason}: ${reasonDescription.trim()}`
      : selectedReason.trim();

    setIsSubmitting(true);

    try {
      const now = new Date();
      const gatepassData = {
        purpose,
        date: format(now, 'yyyy-MM-dd'),
        out_time: format(now, 'HH:mm'),
      };

      await onSubmit(gatepassData);
      
      // Reset form
      setSelectedReason('');
      setReasonDescription('');
      setReasonDescriptionError('');
    } catch (error) {
      console.error('Error submitting gatepass:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">New Gatepass Request</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onCancel}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Select value={selectedReason} onValueChange={handleReasonChange}>
                <SelectTrigger id="purpose">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shouldShowReasonDescription && (
              <div className="space-y-2">
                <Label htmlFor="reason-description">Reason Description *</Label>
                <Textarea
                  id="reason-description"
                  value={reasonDescription}
                  onChange={(e) => handleReasonDescriptionChange(e.target.value)}
                  onBlur={() => {
                    if (isReasonDescriptionMissing) {
                      setReasonDescriptionError('Please enter reason description');
                    }
                  }}
                  placeholder="Enter reason description"
                  required
                  aria-invalid={!!reasonDescriptionError}
                  className="min-h-[90px] resize-none"
                />
                {reasonDescriptionError && (
                  <p className="text-sm text-red-600">{reasonDescriptionError}</p>
                )}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isSubmitting || !selectedReason || isReasonDescriptionMissing}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GatepassRequestForm;
