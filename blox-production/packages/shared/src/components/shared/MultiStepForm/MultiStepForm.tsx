import React, { useState } from 'react';
import { Box, Stepper, Step, StepLabel } from '@mui/material';
import { Button as CustomButton } from '../../core/Button/Button';
import './MultiStepForm.scss';

export interface StepConfig {
  label: string;
  component: React.ComponentType<StepProps>;
}

export interface StepProps {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface MultiStepFormProps {
  steps: StepConfig[];
  initialData?: any;
  onSubmit: (data: any) => void | Promise<void>;
  onCancel?: () => void;
}

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  initialData = {},
  onSubmit,
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(initialData);

  const CurrentStepComponent = steps[activeStep].component;

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleUpdateData = (stepData: any) => {
    setFormData((prev: any) => ({ ...prev, ...stepData }));
  };

  const handleSubmit = async () => {
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;

  return (
    <Box className="multi-step-form">
      <Stepper activeStep={activeStep} alternativeLabel className="form-stepper">
        {steps.map((step, index) => (
          <Step key={index}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box className="form-content">
        <CurrentStepComponent
          data={formData}
          updateData={handleUpdateData}
          onNext={handleNext}
          onPrevious={handleBack}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
        />
      </Box>

      <Box className="form-actions">
        {onCancel && (
          <CustomButton variant="secondary" onClick={onCancel}>
            Cancel
          </CustomButton>
        )}
        <Box className="navigation-buttons">
          {!isFirstStep && (
            <CustomButton variant="secondary" onClick={handleBack}>
              Previous
            </CustomButton>
          )}
          {!isLastStep ? (
            <CustomButton variant="primary" onClick={handleNext}>
              Next
            </CustomButton>
          ) : (
            <CustomButton variant="primary" onClick={handleSubmit}>
              Submit
            </CustomButton>
          )}
        </Box>
      </Box>
    </Box>
  );
};
