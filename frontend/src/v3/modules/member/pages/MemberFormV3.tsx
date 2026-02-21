import React, { useState } from 'react';

// MUI Components
import {
    Grid,
    TextField,
    Button,
    MenuItem,
    Stack,
    Typography
} from '@mui/material';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import { useMembersV3 } from '../hooks/useMembers.v3';
import { People as PeopleIcon } from '@mui/icons-material';

/**
 * Member Form for Principal registration (V3).
 * Simplified example focusing on Clean Architecture.
 */
const MemberFormV3: React.FC = () => {
    const { registerPrincipal, loading } = useMembersV3();
    const [formData, setFormData] = useState({
        fullName: '',
        civilId: '',
        cardNumber: '',
        birthDate: '',
        gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await registerPrincipal({
                ...formData,
                isPrincipal: true
            } as any);
            // Navigate back to list or show success
            alert('Principal registered successfully');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <>
            <UnifiedPageHeader
                title="Register Principal Member"
                subtitle="Clean Architecture (V3)"
                icon={PeopleIcon}
                showAddButton={false}
            />

            <MainCard sx={{ mt: 2 }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Civil ID"
                                name="civilId"
                                value={formData.civilId}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Card Number"
                                name="cardNumber"
                                value={formData.cardNumber}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Gender"
                                name="gender"
                                select
                                value={formData.gender}
                                onChange={handleChange}
                            >
                                <MenuItem value="MALE">Male</MenuItem>
                                <MenuItem value="FEMALE">Female</MenuItem>
                                <MenuItem value="OTHER">Other</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button color="error" variant="text">Cancel</Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                >
                                    Register Principal
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </form>
            </MainCard>
        </>
    );
};

export default MemberFormV3;
