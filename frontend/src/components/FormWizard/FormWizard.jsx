import React, { useState } from 'react';
import {
    Box,
    Stepper,
    Step,
    StepLabel,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import { Formik, Form } from 'formik';

/**
 * A generic multi-step form wizard component using Material UI Stepper and Formik.
 */
const FormWizard = ({ steps, initialValues, onSubmit, validationSchemas }) => {
    const [activeStep, setActiveStep] = useState(0);
    const isLastStep = activeStep === steps.length - 1;

    const handleNext = (values, actions) => {
        if (isLastStep) {
            onSubmit(values, actions);
        } else {
            setActiveStep(activeStep + 1);
            actions.setTouched({});
            actions.setSubmitting(false);
        }
    };

    const handleBack = () => {
        setActiveStep(activeStep - 1);
    };

    const currentValidationSchema = validationSchemas ? validationSchemas[activeStep] : null;

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Formik
                initialValues={initialValues}
                validationSchema={currentValidationSchema}
                onSubmit={handleNext}
            >
                {({ isSubmitting, values }) => (
                    <Form>
                        {/* Step Content should be provided as children or a render function. 
                For this generic version, we assume the parent handles the content 
                based on activeStep, or we could pass components array. 
            */}

                        <Box sx={{ mb: 4, minHeight: '200px' }}>
                            {/* This is where the step-specific fields go */}
                            {/* The parent component using FormWizard will typically inject fields here */}
                            <Typography variant="h6" gutterBottom>
                                الخطوة {activeStep + 1}: {steps[activeStep]}
                            </Typography>

                            {/* Render dynamic content based on activeStep */}
                            {/* In a real implementation, you'd pass a 'renderStep' prop or similar */}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            {activeStep !== 0 && (
                                <Button onClick={handleBack} disabled={isSubmitting}>
                                    السابق
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                type="submit"
                                disabled={isSubmitting}
                                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                            >
                                {isLastStep ? 'إرسال' : 'التالي'}
                            </Button>
                        </Box>
                    </Form>
                )}
            </Formik>
        </Box>
    );
};

export default FormWizard;
