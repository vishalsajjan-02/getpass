
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { User, Phone, Mail, FileText, Users } from 'lucide-react';

interface GuestFormData {
  name: string;
  mobile: string;
  email: string;
  purpose: string;
  reportingPerson: string;
}

const GuestForm = () => {
  const [formData, setFormData] = useState<GuestFormData>({
    name: '',
    mobile: '',
    email: '',
    purpose: '',
    reportingPerson: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Guest form submitted:', formData);
      
      toast({
        title: "Form Submitted Successfully!",
        description: "Your visitor information has been recorded. Please wait for approval."
      });

      // Reset form
      setFormData({
        name: '',
        mobile: '',
        email: '',
        purpose: '',
        reportingPerson: ''
      });

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact reception for assistance.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl max-h-full overflow-y-auto scrollbar-hidden shadow-2xl bg-white/95 backdrop-blur-sm border-0">
        <CardHeader className="text-center space-y-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Visitor Information Form
          </CardTitle>
          <p className="text-green-100">
            Please provide your details for our records
          </p>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-medium flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                  className="h-12 bg-white border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-gray-700 font-medium flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Mobile Number *
                </Label>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Enter your mobile number"
                  required
                  className="h-12 bg-white border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Email Address *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                required
                className="h-12 bg-white border-gray-200 focus:border-green-500 focus:ring-green-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportingPerson" className="text-gray-700 font-medium flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Person to Meet / Reporting Person *
              </Label>
              <Input
                id="reportingPerson"
                name="reportingPerson"
                type="text"
                value={formData.reportingPerson}
                onChange={handleInputChange}
                placeholder="Name of the person you're meeting"
                required
                className="h-12 bg-white border-gray-200 focus:border-green-500 focus:ring-green-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose" className="text-gray-700 font-medium flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Purpose of Visit *
              </Label>
              <Textarea
                id="purpose"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                placeholder="Briefly describe the purpose of your visit"
                required
                rows={4}
                className="bg-white border-gray-200 focus:border-green-500 focus:ring-green-500/20 resize-none"
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Submit Visitor Form</span>
                  </div>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              <strong>Note:</strong> All fields marked with (*) are required. Your information will be kept confidential and used only for security purposes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestForm;
