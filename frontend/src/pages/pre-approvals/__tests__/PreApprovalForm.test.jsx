import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreApprovalCreateFormik from '../PreApprovalCreateFormik';
import { AuthProvider } from 'contexts/AuthContext';
import { SnackbarProvider } from 'notistack';
import { BrowserRouter } from 'react-router-dom';

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <SnackbarProvider>
                <AuthProvider>
                    {component}
                </AuthProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
};

describe('PreApprovalCreateFormik', () => {
    test('renders form fields correctly', () => {
        renderWithProviders(<PreApprovalCreateFormik />);
        expect(screen.getByText(/طلب موافقة مسبقة جديد/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/كود التشخيص/i)).toBeInTheDocument();
    });

    test('shows validation error when diagnosis code is empty', async () => {
        renderWithProviders(<PreApprovalCreateFormik />);
        const submitBtn = screen.getByText(/حفظ الطلب/i);
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/كود التشخيص مطلوب/i)).toBeInTheDocument();
        });
    });

    test('calculates total correctly when service is added', async () => {
        // Mocking implementation...
    });
});
