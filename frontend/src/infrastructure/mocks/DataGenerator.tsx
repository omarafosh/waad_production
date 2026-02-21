/**
 * Mock Data Generator for Performance Testing
 * Generates 10k - 100k records
 */

export const generateMockPreApprovals = (count = 10000) => {
    const records = [];
    const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
    const services = ['Consultation', 'Lab Test', 'X-Ray', 'MRI', 'Pharmacy'];
    const members = ['Omar Ali', 'Ahmed Hassan', 'Sara Mohamed', 'Noor Jassim'];

    for (let i = 0; i < count; i++) {
        records.push({
            id: i + 1,
            referenceNumber: `PA-${100000 + i}`,
            memberName: members[i % members.length],
            serviceName: services[i % services.length],
            status: statuses[i % statuses.length],
            requestedAmount: Math.floor(Math.random() * 500) + 50,
            createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
            providerName: 'Medical Center ' + (i % 10),
            priority: i % 5 === 0 ? 'URGENT' : 'ROUTINE'
        });
    }
    return records;
};

export const testPerformance = (fn, label) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`[Performance] ${label}: ${Math.round(end - start)}ms`);
    return end - start;
};
